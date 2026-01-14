import { NextRequest, NextResponse } from 'next/server'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const execAsync = promisify(exec)
const TEMP_DIR = path.join(process.cwd(), 'temp')

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

import { checkRateLimit } from '@/lib/rateLimit'
import { createJob, updateJob, enqueueJob, completeJob } from '@/lib/jobs'

export async function POST(req: NextRequest) {
    // 1. Rate Limit Check (10 requests per hour)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    const rate = checkRateLimit(ip, 10, 60 * 60 * 1000)

    if (!rate.success) {
        return NextResponse.json(
            { error: 'Transkripsiyon işlem limitiniz doldu.' },
            { status: 429 }
        )
    }

    try {
        const body = await req.json()
        const { videoPath, language = 'tr', model = 'medium' } = body

        if (!videoPath) {
            return NextResponse.json({ error: 'Video path required' }, { status: 400 })
        }

        const inputPath = path.join(process.cwd(), 'public', videoPath)
        if (!fs.existsSync(inputPath)) {
            return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
        }

        // Generate unique ID & Job
        const processId = Date.now().toString()
        const audioPath = path.join(TEMP_DIR, `${processId}.wav`)
        const job = createJob('subtitle')

        // Enqueue the job
        const { canStart, position } = enqueueJob(job.id, 'subtitle')

        const startTranscription = async () => {
            // Wait in queue if needed
            if (!canStart) {
                updateJob(job.id, {
                    status: 'queued',
                    message: `Altyazı sırası bekleniyor... (${position}. sıra)`,
                    queuePosition: position
                })

                // Poll until this job can start
                await new Promise<void>((resolve) => {
                    const checkInterval = setInterval(() => {
                        const currentJob = require('@/lib/jobs').getJob(job.id)
                        if (currentJob?.status === 'processing') {
                            clearInterval(checkInterval)
                            resolve()
                        }
                    }, 1000)
                })
            }

            updateJob(job.id, { status: 'processing', message: 'Ses ayrıştırılıyor...', queuePosition: undefined })

            try {
                console.log('Starting transcription for:', videoPath)

                // Step 1: Extract Audio
                const extractCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`
                await execAsync(extractCmd)

                // HYBRID LOGIC: DB > Env > Local
                // Check DB Setting first
                let transcriptionMode = 'local'

                // Fallback from environment if DB is empty/fails
                if (process.env.USE_EXTERNAL_SUBTITLES === 'true') transcriptionMode = 'cloud' // Legacy Env Support maps to 'cloud' (auto)

                try {
                    const setting = await prisma.systemSetting.findUnique({ where: { key: 'transcription_mode' } })
                    if (setting) transcriptionMode = setting.value
                } catch (e) {
                    console.error('Failed to strict-read settings, falling back to env', e)
                }

                // Determine strategy
                const USE_EXTERNAL = transcriptionMode === 'cloud' || transcriptionMode === 'cloud_force'
                const FORCE_CLOUD = transcriptionMode === 'cloud_force'
                let externalSuccess = false

                if (USE_EXTERNAL) {
                    updateJob(job.id, { message: 'Bulut sunucusuna yükleniyor (FreeSubtitles.ai)...' })

                    try {
                        // 1. Upload
                        const formData = new FormData()
                        const fileBuffer = fs.readFileSync(audioPath)
                        const fileBlob = new Blob([fileBuffer], { type: 'audio/wav' })
                        formData.append('file', fileBlob, 'audio.wav')
                        // formData.append('model', model) // REMOVED: API rejects model parameter
                        formData.append('language', language)

                        const apiKey = process.env.FREESUBTITLES_API_KEY || ''
                        const headers: any = {}
                        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

                        const uploadRes = await fetch('https://freesubtitles.ai/api', {
                            method: 'POST',
                            headers: headers,
                            body: formData
                        })

                        if (uploadRes.status === 429) {
                            throw new Error('External API Rate Limit (429) - Çok fazla istek gönderildi.')
                        }

                        if (!uploadRes.ok) {
                            const errorText = await uploadRes.text()
                            console.error('External API Error Body:', errorText)
                            throw new Error(`External API Upload Failed: ${uploadRes.status} ${uploadRes.statusText} - ${errorText.substring(0, 200)}`)
                        }

                        const uploadData = await uploadRes.json()
                        const externalId = uploadData.id

                        if (!externalId) throw new Error('External API returned no ID')

                        // 2. Poll
                        updateJob(job.id, { message: 'Bulutta işleniyor...' })

                        let result = null
                        let attempts = 0

                        while (attempts < 300) {
                            await new Promise(r => setTimeout(r, 2000)) // 2s polling
                            const statusRes = await fetch(`https://freesubtitles.ai/api/${externalId}`, { headers })

                            if (statusRes.ok) {
                                const statusData = await statusRes.json()
                                if (statusData.status === 'completed') {
                                    result = statusData
                                    break
                                } else if (statusData.status === 'failed') {
                                    throw new Error('External transcription status: failed')
                                }
                                if (statusData.progress) {
                                    updateJob(job.id, { message: `Bulutta işleniyor... %${Math.round(statusData.progress)}` })
                                }
                            }
                            attempts++
                        }

                        if (!result) throw new Error('External API polling timed out')

                        // 3. Success
                        try { fs.unlinkSync(audioPath) } catch (e) { }
                        completeJob(job.id, 'subtitle')

                        updateJob(job.id, {
                            status: 'completed',
                            progress: 100,
                            result: result
                        })
                        externalSuccess = true

                    } catch (extError: any) {
                        console.error('External API Error:', extError.message)

                        if (FORCE_CLOUD) {
                            // If forced, do NOT fallback. Rethrow error to be caught by main catch block
                            throw new Error(`CLOUD_FORCE Mode Error: ${extError.message}`)
                        }

                        // Fallback Trigger (Only if not forced)
                        updateJob(job.id, { message: 'Bulut servisi yoğun, yerel işlemciye geçiliyor...' })
                    }
                }

                // LOCAL FALLBACK / DEFAULT LOGIC
                if (!externalSuccess) {
                    updateJob(job.id, { message: 'Yapay zeka sesi metne dönüştürüyor (Local)...' })

                    // Step 2: Run Python Transcription Script (LOCAL)
                    const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe_json.py')
                    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')

                    const pythonProcess = spawn(pythonPath, [
                        scriptPath,
                        audioPath,
                        '--model', model,
                        '--language', language
                    ])

                    let stdoutData = ''
                    let stderrData = ''

                    await new Promise<void>((resolve, reject) => {
                        // Timeout (10 minutes max)
                        const timeout = setTimeout(() => {
                            pythonProcess.kill()
                            reject(new Error('Transcription process timed out (10 minutes limit)'))
                        }, 10 * 60 * 1000)

                        pythonProcess.stdout.on('data', (data) => {
                            const str = data.toString()
                            stdoutData += str
                            console.log(`[Whisper STDOUT]: ${str.substring(0, 100)}...`)
                        })

                        pythonProcess.stderr.on('data', (data) => {
                            const str = data.toString()
                            stderrData += str
                            console.log(`[Whisper STDERR]: ${str}`)
                            if (str.includes('Downloading') || str.includes('%')) {
                                updateJob(job.id, { message: 'AI Modeli indiriliyor (Bu işlem biraz sürebilir)...' })
                            }
                        })

                        pythonProcess.on('close', (code) => {
                            clearTimeout(timeout)
                            try { fs.unlinkSync(audioPath) } catch (e) { }
                            completeJob(job.id, 'subtitle')
                            if (code !== 0) {
                                reject(new Error(stderrData || 'Transcription process failed'))
                                return
                            }
                            try {
                                const jsonStart = stdoutData.indexOf('{')
                                const jsonEnd = stdoutData.lastIndexOf('}')
                                if (jsonStart === -1 || jsonEnd === -1) {
                                    reject(new Error('Invalid JSON output from script'))
                                    return
                                }
                                const jsonStr = stdoutData.substring(jsonStart, jsonEnd + 1)
                                const result = JSON.parse(jsonStr)
                                if (result.error) {
                                    reject(new Error(result.error))
                                    return
                                }
                                updateJob(job.id, {
                                    status: 'completed',
                                    progress: 100,
                                    result: result
                                })
                                resolve()
                            } catch (e: any) {
                                reject(new Error(`Failed to parse transcription output: ${e.message}`))
                            }
                        })
                    })
                }

            } catch (error: any) {
                console.error('Transcribe API Error:', error)
                completeJob(job.id, 'subtitle')
                updateJob(job.id, { status: 'error', error: error.message })
            }
        }

        // Fire and forget
        startTranscription()

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: canStart ? 'Transkripsiyon başlatıldı' : `Sırada bekleniyor (${position}. sıra)`,
            queued: !canStart,
            queuePosition: position
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)
const TEMP_DIR = path.join(process.cwd(), 'temp')

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

import { checkRateLimit } from '@/lib/rateLimit'
import { createJob, updateJob, enqueueJob, completeJob } from '@/lib/jobs'

export async function POST(req: NextRequest) {
    // 1. Rate Limit Check (Whisper pahalı bir işlem, sıkı limit: 10/saat)
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
        const job = createJob('subtitle') // 'subtitle' queue uses limit: 1 (Sequential)

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
                // Uses -vn (no video), -ac 1 (mono), -ar 16000 (16kHz) for Whisper
                const extractCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`
                await execAsync(extractCmd)

                updateJob(job.id, { message: 'Yapay zeka sesi metne dönüştürüyor...' })

                // Step 2: Run Python Transcription Script
                const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe_json.py')

                // Use spawn to capture large JSON output safely
                const pythonProcess = spawn('python', [
                    scriptPath,
                    audioPath,
                    '--model', model,
                    '--language', language
                ])

                let stdoutData = ''
                let stderrData = ''

                await new Promise<void>((resolve, reject) => {
                    // Timeout (10 minutes max for transcription)
                    const timeout = setTimeout(() => {
                        pythonProcess.kill()
                        reject(new Error('Transcription process timed out (10 minutes limit)'))
                    }, 10 * 60 * 1000)

                    pythonProcess.stdout.on('data', (data) => {
                        const str = data.toString()
                        stdoutData += str
                        console.log(`[Whisper STDOUT]: ${str.substring(0, 100)}...`) // Log snippet
                    })

                    pythonProcess.stderr.on('data', (data) => {
                        const str = data.toString()
                        stderrData += str
                        console.log(`[Whisper STDERR]: ${str}`)

                        // Detect model downloading state
                        if (str.includes('Downloading') || str.includes('%')) {
                            updateJob(job.id, { message: 'AI Modeli ilk kez indiriliyor (Bu işlem birkaç dakika sürebilir)...' })
                        }
                    })

                    pythonProcess.on('close', (code) => {
                        clearTimeout(timeout)

                        // Cleanup audio file
                        try { fs.unlinkSync(audioPath) } catch (e) { console.error('Cleanup error:', e) }

                        // Always release the slot!
                        completeJob(job.id, 'subtitle')

                        if (code !== 0) {
                            console.error('Transcription failed:', stderrData)
                            reject(new Error(stderrData || 'Transcription process failed'))
                            return
                        }

                        try {
                            // Find the last valid JSON in output
                            const jsonStart = stdoutData.indexOf('{')
                            const jsonEnd = stdoutData.lastIndexOf('}')

                            if (jsonStart === -1 || jsonEnd === -1) {
                                console.error('Invalid JSON Output:', stdoutData)
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

            } catch (error: any) {
                console.error('Transcribe API Error:', error)
                // Release slot if not already released (safety check handled by completeJob logic if ID missing/duplicate removal ok)
                // But generally completeJob handles the removal. 
                // In the catch block above (inside spawn close), we call completeJob.
                // If error happens BEFORE spawn (e.g. ffmpeg extract), we need to call it here.
                // To be safe, we can call it here too? No, active.delete returns false if not found. Safe.
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

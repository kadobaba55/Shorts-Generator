import { NextRequest, NextResponse } from 'next/server'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@deepgram/sdk'

const prisma = new PrismaClient()
const execAsync = promisify(exec)
const TEMP_DIR = path.join(process.cwd(), 'temp')

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
}

import { checkRateLimit } from '@/lib/rateLimit'
import { createJob, updateJob, enqueueJob, completeJob } from '@/lib/jobs'

// --- DEEPGRAM LOGIC ---
// --- DEEPGRAM LOGIC ---
async function transcribeWithDeepgram(jobId: string, audioPath: string, language: string) {
    updateJob(jobId, { message: 'Deepgram ile işleniyor (Hızlı Mod)...' })

    const deepgramKey = process.env.DEEPGRAM_API_KEY
    if (!deepgramKey) throw new Error('Deepgram API Key eksik.')

    const deepgram = createClient(deepgramKey)

    const fileBuffer = fs.readFileSync(audioPath)

    // Call Deepgram API
    // Model: nova-2 (fastest & most accurate)
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        fileBuffer,
        {
            model: 'nova-2',
            language: language,
            smart_format: true,
            punctuate: true,
            diarize: false,
        }
    )

    if (error) throw new Error(`Deepgram Error: ${error.message}`)
    if (!result?.results?.channels?.[0]?.alternatives?.[0]) throw new Error('Deepgram boş sonuç döndürdü.')

    const alternative = result.results.channels[0].alternatives[0]
    const words = alternative.words || []

    // --- SMART SEGMENTATION FOR SHORTS ---
    // Instead of using big paragraphs, we chunk words into small groups.
    // Goal: 1-5 words per segment, max 2 seconds duration if possible, optimal for reading.

    let segments: any[] = []
    let currentSegment: { start: number, end: number, text: string, words: any[] } | null = null
    let segmentIndex = 1

    const MAX_WORDS_PER_SEGMENT = 4
    const MAX_CHARS_PER_SEGMENT = 35 // Max characters per line approx

    for (const wordObj of words) {
        const word = wordObj.word
        const start = wordObj.start
        const end = wordObj.end

        if (!currentSegment) {
            currentSegment = { start, end, text: word, words: [wordObj] }
            continue
        }

        // Check limits
        const newText = currentSegment.text + " " + word
        const wordCount = currentSegment.words.length + 1
        // const duration = end - currentSegment.start

        // Break if:
        // 1. Too many words
        // 2. Too many characters
        // 3. (Optional) Pause/Silence detection could happen here based on time gap vs previous word
        if (wordCount > MAX_WORDS_PER_SEGMENT || newText.length > MAX_CHARS_PER_SEGMENT) {
            // Push old segment
            segments.push({
                id: segmentIndex++,
                start: currentSegment.start,
                end: currentSegment.end,
                text: currentSegment.text
            })
            // Start new
            currentSegment = { start, end, text: word, words: [wordObj] }
        } else {
            // Append
            currentSegment.end = end
            currentSegment.text = newText
            currentSegment.words.push(wordObj)
        }
    }

    // Push last segment
    if (currentSegment) {
        segments.push({
            id: segmentIndex++,
            start: currentSegment.start,
            end: currentSegment.end,
            text: currentSegment.text
        })
    }

    // Fallback if no words found but transcript exists (rare)
    if (segments.length === 0 && alternative.transcript) {
        segments.push({
            id: 1,
            start: 0,
            end: alternative.words?.[alternative.words.length - 1]?.end || 0,
            text: alternative.transcript
        })
    }

    return {
        segments,
        text: alternative.transcript
    }
}

// --- WHISPER LOCAL LOGIC ---
async function transcribeWithWhisper(jobId: string, audioPath: string, model: string, language: string) {
    updateJob(jobId, { message: 'Yapay zeka (Whisper) sesi metne dönüştürüyor...' })

    const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe_json.py')
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')

    return new Promise<any>((resolve, reject) => {
        const pythonProcess = spawn(pythonPath, [
            scriptPath,
            audioPath,
            '--model', model,
            '--language', language
        ])

        let stdoutData = ''
        let stderrData = ''

        const timeout = setTimeout(() => {
            pythonProcess.kill()
            reject(new Error('Whisper process timed out (10 mins limit)'))
        }, 10 * 60 * 1000)

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString()
        })

        pythonProcess.stderr.on('data', (data) => {
            const str = data.toString()
            stderrData += str
            console.log(`[Whisper]: ${str}`)
            if (str.includes('%')) {
                // Parse progress if possible, or just ignore
            }
        })

        pythonProcess.on('close', (code) => {
            clearTimeout(timeout)
            if (code !== 0) {
                reject(new Error(stderrData || 'Whisper process failed'))
                return
            }
            try {
                const jsonStart = stdoutData.indexOf('{')
                const jsonEnd = stdoutData.lastIndexOf('}')
                if (jsonStart === -1) throw new Error('Invalid JSON from Whisper')

                const jsonStr = stdoutData.substring(jsonStart, jsonEnd + 1)
                const result = JSON.parse(jsonStr)
                resolve(result)
            } catch (e: any) {
                reject(new Error(`Whisper JSON Parse Failed: ${e.message}`))
            }
        })
    })
}


export async function POST(req: NextRequest) {
    // 1. Rate Limit
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    const rate = checkRateLimit(ip, 20, 60 * 60 * 1000) // Increased limit slightly
    if (!rate.success) return NextResponse.json({ error: 'Limit aşıldı.' }, { status: 429 })

    try {
        const body = await req.json()
        const { videoPath, language = 'tr', model = 'medium' } = body

        if (!videoPath) return NextResponse.json({ error: 'No video path' }, { status: 400 })
        const inputPath = path.join(process.cwd(), 'public', videoPath)
        if (!fs.existsSync(inputPath)) return NextResponse.json({ error: 'File not found' }, { status: 404 })

        // Job Setup
        const job = createJob('subtitle')
        const { canStart, position } = enqueueJob(job.id, 'subtitle');

        // Async Processing
        (async () => {
            // Wait for queue
            if (!canStart) {
                updateJob(job.id, {
                    status: 'queued',
                    message: `Sırada bekleniyor (${position})...`,
                    queuePosition: position
                })
                // Simple poll wait
                while (true) {
                    await new Promise(r => setTimeout(r, 1000))
                    const current = require('@/lib/jobs').getJob(job.id)
                    if (current?.status === 'processing') break
                }
            }

            updateJob(job.id, { status: 'processing', message: 'Ses ayrıştırılıyor...', queuePosition: undefined })

            const processId = Date.now().toString()
            const audioPath = path.join(TEMP_DIR, `${processId}.wav`)

            try {
                // Extract Audio
                await execAsync(`ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`)

                // Check Provider Setting
                let provider = 'deepgram' // Default
                const setting = await prisma.systemSetting.findUnique({ where: { key: 'transcription_mode' } })
                if (setting?.value) provider = setting.value

                // If legacy 'cloud' or 'cloud_force' is in DB, map to deepgram
                if (provider === 'cloud' || provider === 'cloud_force') provider = 'deepgram'

                let result = null

                if (provider === 'deepgram') {
                    try {
                        result = await transcribeWithDeepgram(job.id, audioPath, language)
                    } catch (e: any) {
                        console.error('Deepgram failed, falling back to local?', e)
                        // Optional: Fallback to local if deepgram fails? 
                        // User said "preserve whisper as backup". 
                        // Usually explicit "Backup" means if primary fails. 
                        // But if Admin selects "Deepgram", maybe they just want Deepgram.
                        // Let's implement auto-fallback with a toast warning ideally, 
                        // but here accessing frontend toast is impossible.
                        // Let's update job message.
                        updateJob(job.id, { message: 'Deepgram hatası, yerel motora geçiliyor...' })
                        result = await transcribeWithWhisper(job.id, audioPath, model, language)
                    }
                } else {
                    // Local
                    result = await transcribeWithWhisper(job.id, audioPath, model, language)
                }

                // Cleanup
                try { fs.unlinkSync(audioPath) } catch (e) { }

                completeJob(job.id, 'subtitle')
                updateJob(job.id, {
                    status: 'completed',
                    progress: 100,
                    result: result
                })

            } catch (err: any) {
                console.error('Processing Error:', err)
                try { fs.unlinkSync(audioPath) } catch (e) { }
                completeJob(job.id, 'subtitle')
                updateJob(job.id, { status: 'error', error: err.message })
            }
        })()

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: canStart ? 'Başlatıldı' : 'Sırada',
            queued: !canStart
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

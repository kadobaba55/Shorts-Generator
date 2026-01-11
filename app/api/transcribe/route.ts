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
        const body = await req.json() // Keep original JSON parsing
        const { videoPath, language = 'tr', model = 'tiny' } = body

        if (!videoPath) {
            return NextResponse.json({ error: 'Video path required' }, { status: 400 })
        }

        const inputPath = path.join(process.cwd(), 'public', videoPath)
        if (!fs.existsSync(inputPath)) {
            return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
        }

        // Generate unique ID
        const processId = Date.now().toString()
        const audioPath = path.join(TEMP_DIR, `${processId}.wav`)

        console.log('Starting transcription for:', videoPath)

        // Step 1: Extract Audio
        // Uses -vn (no video), -ac 1 (mono), -ar 16000 (16kHz) for Whisper
        const extractCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`
        await execAsync(extractCmd)

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

        const transcriptionResult = await new Promise((resolve, reject) => {
            pythonProcess.stdout.on('data', (data) => {
                stdoutData += data.toString()
            })

            pythonProcess.stderr.on('data', (data) => {
                stderrData += data.toString()
            })

            pythonProcess.on('close', (code) => {
                // Cleanup audio file
                try { fs.unlinkSync(audioPath) } catch (e) { console.error('Cleanup error:', e) }

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
                        reject(new Error('Invalid JSON output from script'))
                        return
                    }

                    const jsonStr = stdoutData.substring(jsonStart, jsonEnd + 1)
                    const result = JSON.parse(jsonStr)

                    if (result.error) {
                        reject(new Error(result.error))
                        return
                    }

                    resolve(result)
                } catch (e: any) {
                    reject(new Error(`Failed to parse transcription output: ${e.message}`))
                }
            })
        })

        return NextResponse.json(transcriptionResult)

    } catch (error: any) {
        console.error('Transcribe API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

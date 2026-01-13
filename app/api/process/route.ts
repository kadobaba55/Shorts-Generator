import { NextRequest, NextResponse } from 'next/server'
import ffmpeg from 'ffmpeg-static'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createJob, updateJob, enqueueJob, completeJob } from '@/lib/jobs'

const execAsync = promisify(exec)

const VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos')
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'output')

interface Clip {
    id: string
    start: number
    end: number
}

interface ProcessRequest {
    videoPath: string
    clips: Clip[]
    addSubtitles?: boolean
}



// Helper to parse FFmpeg time format (HH:MM:SS.ms) to seconds
function parseDuration(timeStr: string): number {
    const parts = timeStr.trim().split(':')
    if (parts.length < 3) return 0
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const ip = request.headers.get('x-forwarded-for') || 'anonymous'

        if (!session?.user?.email) {
            return NextResponse.json({ error: "İşlem yapabilmek için giriş yapmalısınız." }, { status: 401 })
        }

        // Giriş yapmış kullanıcı
        user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user || user.tokens < 1) {
            return NextResponse.json({ error: "Yetersiz token! Lütfen token yükleyin." }, { status: 403 })
        }

        const { videoPath, clips, addSubtitles = true }: ProcessRequest = await request.json()

        if (!videoPath || !clips || clips.length === 0) {
            return NextResponse.json({ error: 'Video path and clips are required' }, { status: 400 })
        }

        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true })
        }

        const job = createJob('process')
        const outputId = Date.now().toString()
        const processedClips: string[] = []
        const inputPath = path.join(process.cwd(), 'public', videoPath)

        // Enqueue the job - check if it can start immediately
        const { canStart, position } = enqueueJob(job.id, 'process')

        // Background Processing
        const startProcessing = async () => {
            // Wait in queue if needed
            if (!canStart) {
                updateJob(job.id, {
                    status: 'queued',
                    message: `İşlem sırası bekleniyor... (${position}. sıra)`,
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

            updateJob(job.id, { status: 'processing', message: 'Klipler hazırlanıyor...', queuePosition: undefined })

            try {
                // Process clips sequentially to track progress accurately
                for (let i = 0; i < clips.length; i++) {
                    const clip = clips[i]
                    const clipOutputPath = path.join(OUTPUT_DIR, `${outputId}_clip_${i + 1}.mp4`)
                    const duration = clip.end - clip.start

                    updateJob(job.id, { message: `Klip ${i + 1}/${clips.length} işleniyor...` })

                    // 1. Face Detection (Fast)
                    let vfFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`
                    try {
                        const detectCmd = `python scripts/detect_face.py "${inputPath}" ${clip.start} ${duration}`
                        const { stdout } = await execAsync(detectCmd, { timeout: 30000 })
                        const detection = JSON.parse(stdout)

                        if (detection.found && detection.avg_x !== undefined) {
                            const scaledWidth = Math.ceil((detection.width / detection.height) * 1920)
                            let cropX = Math.round((detection.avg_x * scaledWidth) - (1080 / 2))
                            cropX = Math.max(0, Math.min(scaledWidth - 1080, cropX))
                            vfFilter = `scale=-1:1920,crop=1080:1920:${cropX}:0`
                        }
                    } catch (e) {
                        console.error('Face detection failed:', e)
                    }

                    // 2. FFmpeg Encoding with Progress
                    const fadeFilter = `,fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5`
                    const fullFilter = vfFilter + fadeFilter

                    await new Promise<void>((resolve, reject) => {
                        // Determine FFmpeg path (fallback to system ffmpeg if static not found)
                        let ffmpegPath = ffmpeg
                        // If ffmpeg-static returns null or file doesn't exist, use system 'ffmpeg'
                        if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
                            console.warn('⚠️ FFmpeg static binary not found, using system ffmpeg')
                            ffmpegPath = 'ffmpeg' // Assumes ffmpeg is installed via apt/yum
                        }

                        console.log('FFmpeg Path:', ffmpegPath)
                        console.log('FFmpeg Starting for:', clipOutputPath)

                        const ffmpegArgs = [
                            '-y', '-ss', clip.start.toString(),
                            '-i', inputPath,
                            '-t', duration.toString(),
                            '-vf', fullFilter,
                            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26', '-threads', '0',
                            '-pix_fmt', 'yuv420p',
                            '-movflags', '+faststart',
                            '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '44100',
                            clipOutputPath
                        ]

                        // Debug args
                        console.log('FFmpeg Args:', ffmpegArgs.join(' '))

                        const child = spawn(ffmpegPath, ffmpegArgs)

                        let stderrLog = ''

                        child.stderr.on('data', (data) => {
                            const output = data.toString()
                            stderrLog += output.slice(-500) // Keep last 500 chars for error logging

                            const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/)

                            if (timeMatch) {
                                const currentTime = parseDuration(timeMatch[1])
                                const clipProgress = Math.min((currentTime / duration) * 100, 100)

                                // Calculate global progress based on current clip index
                                const globalProgress = ((i * 100) + clipProgress) / clips.length
                                updateJob(job.id, { progress: globalProgress })
                            }
                        })

                        child.on('close', (code) => {
                            if (code === 0) {
                                // Double check if file exists
                                if (fs.existsSync(clipOutputPath)) {
                                    console.log('✅ File created successfully:', clipOutputPath)
                                    const stats = fs.statSync(clipOutputPath)
                                    console.log('📦 File size:', stats.size)
                                    if (stats.size === 0) {
                                        reject(new Error('File created but size is 0 bytes'))
                                    } else {
                                        resolve()
                                    }
                                } else {
                                    console.error('❌ File NOT found after ffmpeg finished:', clipOutputPath)
                                    reject(new Error('FFmpeg finished but file not found'))
                                }
                            } else {
                                console.error(`FFmpeg failed with code ${code}`)
                                console.error('Last stderr:', stderrLog)
                                reject(new Error(`FFmpeg exited with code ${code}`))
                            }
                        })

                        child.on('error', (err) => {
                            console.error('Spawn error:', err)
                            reject(err)
                        })
                    })

                    // ... Previous FFmpeg code ...

                    // 3. Upload to Google Cloud Storage (If configured)
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const { uploadToStorage } = require('@/lib/storage')
                        const filename = `${outputId}_clip_${i + 1}.mp4`
                        const gcsUrl = await uploadToStorage(clipOutputPath, filename)

                        console.log('☁️ Uploaded to GCS:', gcsUrl)
                        processedClips.push(gcsUrl)

                        // Delete local file after upload
                        fs.unlinkSync(clipOutputPath)
                    } catch (uploadError: any) {
                        console.error('⚠️ GCS Upload Failed:', uploadError.message || uploadError)
                        console.warn('Falling back to local file path')
                        // Fallback to local file relative path for frontend
                        // Remove /public/ from path if it exists to make it a valid URL
                        processedClips.push(`/output/${outputId}_clip_${i + 1}.mp4`)
                    }
                } // End loop

                // Deduct token (database update) - Only for logged-in users
                // Guest users don't have tokens, they use IP-based daily limit
                if (user && !isGuest) {
                    if (user) {
                        await Promise.all([
                            prisma.user.update({
                                where: { id: user.id },
                                data: { tokens: { decrement: 1 } }
                            })
                        ])
                    }

                    completeJob(job.id, 'process')

                    updateJob(job.id, {
                        status: 'completed',
                        progress: 100,
                        result: {
                            success: true,
                            outputId,
                            clips: processedClips,
                            message: `${clips.length} klip başarıyla işlendi`
                        }
                    })

                } catch (error: any) {
                    console.error('Processing job error:', error)
                    completeJob(job.id, 'process')
                    updateJob(job.id, { status: 'error', error: error.message || 'İşlem hatası' })
                }
            }

        // Fire and forget
        startProcessing()

            return NextResponse.json({
                success: true,
                jobId: job.id,
                message: canStart ? 'işlem başlatıldı' : `Sırada bekleniyor (${position}. sıra)`,
                queued: !canStart,
                queuePosition: position
            })

        } catch (error: any) {
            console.error('Process error:', error)
            return NextResponse.json(
                { error: error.message || 'Video işleme hatası' },
                { status: 500 }
            )
        }
    }

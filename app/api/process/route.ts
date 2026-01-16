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
import { handleClipStorage } from '@/lib/storage'

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
        const user = await prisma.user.findUnique({
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

        // Handle Remote URL (R2) vs Local File
        let inputPath = videoPath
        const isRemote = videoPath.startsWith('http')

        if (!isRemote) {
            inputPath = path.join(process.cwd(), 'public', videoPath)
            if (!fs.existsSync(inputPath)) {
                return NextResponse.json({ error: 'Video bulunamadı' }, { status: 404 })
            }
        }

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
                    // Add padding (buffer) to start and end
                    const BUFFER = 15 // seconds
                    const originalStart = clip.start
                    const originalEnd = clip.end

                    // New start/end with padding
                    const paddedStart = Math.max(0, originalStart - BUFFER)

                    const paddedEnd = originalEnd + BUFFER

                    const duration = paddedEnd - paddedStart
                    const paddingStart = originalStart - paddedStart

                    const clipOutputPath = path.join(OUTPUT_DIR, `${outputId}_clip_${i + 1}.mp4`)

                    updateJob(job.id, { message: `Klip ${i + 1}/${clips.length} işleniyor...` })

                    // 1. Face Detection (Fast) - Use the padded segment
                    let vfFilter = `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`
                    try {
                        const detectCmd = `python scripts/detect_face.py "${inputPath}" ${originalStart} ${originalEnd - originalStart}`
                        const { stdout } = await execAsync(detectCmd, { timeout: 30000 })
                        const detection = JSON.parse(stdout)

                        if (detection.found && detection.avg_x !== undefined) {
                            const scaledWidth = Math.ceil((detection.width / detection.height) * 1920)
                            let cropX = Math.round((detection.avg_x * scaledWidth) - (1080 / 2))
                            cropX = Math.max(0, Math.min(scaledWidth - 1080, cropX))
                            vfFilter = `scale=-1:1920,crop=1080:1920:${cropX}:0`
                        }
                    } catch (e) {
                        // Fallback silently to center crop/pad
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

                        const ffmpegArgs = [
                            '-y', '-ss', paddedStart.toString(),
                            '-i', inputPath,
                            '-t', duration.toString(),
                            '-vf', fullFilter,
                            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26', '-threads', '0',
                            '-pix_fmt', 'yuv420p',
                            '-movflags', '+faststart',
                            '-c:a', 'aac', '-b:a', '128k', '-ac', '2', '-ar', '44100',
                            clipOutputPath
                        ]

                        const child = spawn(ffmpegPath, ffmpegArgs)

                        let stderrLog = ''

                        child.stderr.on('data', (data) => {
                            const output = data.toString()
                            stderrLog += output.slice(-500)
                            const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/)

                            if (timeMatch) {
                                const currentTime = parseDuration(timeMatch[1])
                                const clipProgress = Math.min((currentTime / duration) * 100, 100)
                                const globalProgress = ((i * 100) + clipProgress) / clips.length
                                updateJob(job.id, { progress: globalProgress })
                            }
                        })

                        child.on('close', (code) => {
                            if (code === 0) {
                                if (fs.existsSync(clipOutputPath)) {
                                    const stats = fs.statSync(clipOutputPath)
                                    if (stats.size === 0) {
                                        reject(new Error('File created but size is 0 bytes'))
                                    } else {
                                        resolve()
                                    }
                                } else {
                                    reject(new Error('FFmpeg finished but file not found'))
                                }
                            } else {
                                console.error(`FFmpeg failed with code ${code}`)
                                reject(new Error(`FFmpeg exited with code ${code}`))
                            }
                        })

                        child.on('error', (err) => {
                            reject(err)
                        })
                    })

                    // 3. Storage Handling (Cloud or Local based on settings)
                    try {
                        const filename = `cuts/${outputId}_clip_${i + 1}.mp4`
                        updateJob(job.id, { message: `Klip ${i + 1} kaydediliyor...` })

                        // handleClipStorage manages upload/move and cleanup
                        const fileUrl = await handleClipStorage(clipOutputPath, filename)

                        console.log(`✅ Clip saved: ${fileUrl}`)
                        processedClips.push(JSON.stringify({
                            url: fileUrl,
                            paddingStart
                        }))
                    } catch (storageError: any) {
                        console.error('⚠️ Storage Failed:', storageError.message || storageError)
                        // Fallback to local path if storage handler fails completely
                        processedClips.push(JSON.stringify({
                            url: `/output/${outputId}_clip_${i + 1}.mp4`,
                            paddingStart
                        }))
                    }
                } // End loop

                // Deduct token (database update)
                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { tokens: { decrement: 1 } }
                    })
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
                console.log(`✅ Process job ${job.id} completed successfully with ${processedClips.length} clips`)

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

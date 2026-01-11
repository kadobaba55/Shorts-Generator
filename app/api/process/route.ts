import { NextRequest, NextResponse } from 'next/server'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createJob, updateJob } from '@/lib/jobs'

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
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 })
        }

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
        const inputPath = path.join(process.cwd(), 'public', videoPath)

        // Background Processing
        const startProcessing = async () => {
            updateJob(job.id, { status: 'processing', message: 'Klipler hazırlanıyor...' })

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
                        const ffmpegArgs = [
                            '-y', '-ss', clip.start.toString(),
                            '-i', inputPath,
                            '-t', duration.toString(),
                            '-vf', fullFilter,
                            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '26', '-threads', '0',
                            '-c:a', 'aac', '-b:a', '128k',
                            clipOutputPath
                        ]

                        const child = spawn('ffmpeg', ffmpegArgs)

                        child.stderr.on('data', (data) => {
                            const output = data.toString()
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
                            if (code === 0) resolve()
                            else reject(new Error(`FFmpeg exited with code ${code}`))
                        })

                        child.on('error', (err) => reject(err))
                    })

                    processedClips.push(`/output/${outputId}_clip_${i + 1}.mp4`)
                }

                // Deduct token (database update)
                await prisma.$transaction([
                    prisma.transaction.create({
                        data: {
                            userId: user.id,
                            amount: -1,
                            type: 'USAGE'
                        }
                    }),
                    prisma.user.update({
                        where: { id: user.id },
                        data: { tokens: { decrement: 1 } }
                    })
                ])

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
                updateJob(job.id, { status: 'error', error: error.message || 'İşlem hatası' })
            }
        }

        // Fire and forget
        startProcessing()

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'İşlem başlatıldı'
        })

    } catch (error: any) {
        console.error('Process error:', error)
        return NextResponse.json(
            { error: error.message || 'Video işleme hatası' },
            { status: 500 }
        )
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

// Ensure videos directory exists
const VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos')

import { spawn } from 'child_process'
import { createJob, updateJob, enqueueJob, completeJob, canStartJob } from '@/lib/jobs'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    // 1. Rate Limit Check
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    const rate = checkRateLimit(ip, 50, 60 * 60 * 1000)

    if (!rate.success) {
        return NextResponse.json(
            { error: 'Saatlik işlem limitiniz doldu. Lütfen daha sonra tekrar deneyin.' },
            { status: 429 }
        )
    }

    try {
        const { url } = await req.json()

        if (!url) {
            return NextResponse.json({ error: 'URL gerekli' }, { status: 400 })
        }

        // Validate YouTube URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/
        if (!youtubeRegex.test(url)) {
            return NextResponse.json({ error: 'Geçersiz YouTube URL' }, { status: 400 })
        }

        // Create videos directory if it doesn't exist
        if (!fs.existsSync(VIDEOS_DIR)) {
            fs.mkdirSync(VIDEOS_DIR, { recursive: true })
        }

        // Generate unique filename
        const videoId = Date.now().toString()
        const outputPath = path.join(VIDEOS_DIR, `${videoId}.mp4`)
        const job = createJob('download')

        // Enqueue the job - check if it can start immediately
        const { canStart, position } = enqueueJob(job.id, 'download')

        // Start background process
        const startDownload = async () => {
            // Wait in queue if needed
            if (!canStart) {
                updateJob(job.id, {
                    status: 'queued',
                    message: `Sırada bekleniyor... (${position}. sıra)`,
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

            updateJob(job.id, { status: 'processing', message: 'Video bilgileri alınıyor...', queuePosition: undefined })

            try {
                const cookiePath = path.join(process.cwd(), 'cookies.txt')
                const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                let infoCommand = `python3 -m yt_dlp --dump-json "${url}" --user-agent "${userAgent}" --extractor-args "youtube:player_client=android"`

                if (fs.existsSync(cookiePath)) {
                    infoCommand += ` --cookies "${cookiePath}"`
                    updateJob(job.id, { message: '🍪 Cookie dosyası kullanılıyor...' })
                }

                const { stdout: infoJson } = await execAsync(infoCommand, { maxBuffer: 50 * 1024 * 1024 })
                const videoInfo = JSON.parse(infoJson)

                updateJob(job.id, { message: `İndiriliyor: ${videoInfo.title.substring(0, 30)}...` })

                let errorOutput = ''

                const args = [
                    '-u',
                    '-m', 'yt_dlp',
                    '-f', 'best[ext=mp4]/best',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    '--extractor-args', 'youtube:player_client=android',
                    '-o', outputPath,
                    '--newline',
                    '--no-colors'
                ]

                if (fs.existsSync(cookiePath)) {
                    args.push('--cookies', cookiePath)
                }

                args.push(url)

                const child = spawn('python3', args, {
                    env: { ...process.env, PYTHONUNBUFFERED: '1' }
                })

                const parseOutput = (data: Buffer) => {
                    const output = data.toString()
                    console.log('yt-dlp output:', output.trim())

                    const progressMatch = output.match(/(\d{1,3}(\.\d+)?)%/)
                    const etaMatch = output.match(/ETA\s+(\d+:\d+)/)

                    if (progressMatch) {
                        const progress = parseFloat(progressMatch[1])
                        if (!isNaN(progress) && progress > 0 && progress <= 100) {
                            updateJob(job.id, {
                                progress,
                                eta: etaMatch ? etaMatch[1] : undefined
                            })
                        }
                    }
                }

                child.stdout.on('data', parseOutput)

                child.stderr.on('data', (data) => {
                    const output = data.toString()
                    errorOutput += output
                    if (!output.includes('[download]') && !output.includes('%')) {
                        console.error('yt-dlp stderr:', output)
                    }
                    parseOutput(data)
                })

                child.on('close', (code) => {
                    // Always release the slot when done
                    completeJob(job.id, 'download')

                    if (code === 0) {
                        updateJob(job.id, {
                            status: 'completed',
                            progress: 100,
                            result: {
                                videoId,
                                videoPath: `/videos/${videoId}.mp4`,
                                title: videoInfo.title,
                                duration: videoInfo.duration,
                                thumbnail: videoInfo.thumbnail
                            }
                        })
                    } else {
                        console.error('Download failed with code', code)
                        console.error('Error output:', errorOutput)

                        let failReason = 'Bilinmeyen hata'
                        if (errorOutput) {
                            const lines = errorOutput.split('\n')
                            failReason = lines.find(l => l.includes('ERROR:')) ||
                                lines.find(l => l.includes('Errno')) ||
                                lines.find(l => l.trim().length > 0 && !l.includes('[download]')) ||
                                errorOutput.substring(0, 100)
                        }

                        updateJob(job.id, { status: 'error', error: `İndirme hatası (${code}): ${failReason}` })
                    }
                })

            } catch (error: any) {
                console.error('Download setup error:', error)
                completeJob(job.id, 'download') // Release slot on error
                updateJob(job.id, { status: 'error', error: error.message || 'Başlatma hatası' })
            }
        }

        // Fire and forget
        startDownload()

        // Return job ID immediately with queue info
        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: canStart ? 'İndirme başlatıldı' : `Sırada bekleniyor (${position}. sıra)`,
            queued: !canStart,
            queuePosition: position
        })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Sunucu hatası' },
            { status: 500 }
        )
    }
}

// Get video info without downloading
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
        return NextResponse.json(
            { error: 'URL gerekli' },
            { status: 400 }
        )
    }

    try {
        const cookiePath = path.join(process.cwd(), 'cookies.txt')
        let infoCommand = `python -m yt_dlp --dump-json "${url}"`

        if (fs.existsSync(cookiePath)) {
            infoCommand += ` --cookies "${cookiePath}"`
        }

        const { stdout } = await execAsync(infoCommand, { maxBuffer: 50 * 1024 * 1024 })
        const videoInfo = JSON.parse(stdout)

        return NextResponse.json({
            title: videoInfo.title,
            duration: videoInfo.duration,
            thumbnail: videoInfo.thumbnail,
            channel: videoInfo.channel,
            viewCount: videoInfo.view_count
        })

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Video bilgisi alınamadı' },
            { status: 500 }
        )
    }
}

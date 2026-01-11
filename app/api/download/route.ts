import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

// Ensure videos directory exists
const VIDEOS_DIR = path.join(process.cwd(), 'public', 'videos')

import { spawn } from 'child_process'
import { createJob, updateJob } from '@/lib/jobs'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
    // 1. Rate Limit Check
    // Gerçek IP'yi almak için x-forwarded-for veya production ortamına göre ayar gerekebilir.
    // Docker/Local ortamda genellikle '127.0.0.1' görünür.
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'

    // Limit: Saatte 5 indirme
    const rate = checkRateLimit(ip, 5, 60 * 60 * 1000)

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

        // Start background process
        // We use a promise wrapper to handle the spawn cleanly without blocking the response
        const startDownload = async () => {
            updateJob(job.id, { status: 'processing', message: 'Video bilgileri alınıyor...' })

            // Get video info first (simpler command, synchronous wait is fine for this part as it's fast)
            try {
                const infoCommand = `python -m yt_dlp --dump-json "${url}"`
                const { stdout: infoJson } = await execAsync(infoCommand, { maxBuffer: 50 * 1024 * 1024 })
                const videoInfo = JSON.parse(infoJson)

                // Start generic download
                updateJob(job.id, { message: `İndiriliyor: ${videoInfo.title.substring(0, 30)}...` })

                let errorOutput = ''

                // Use -u to force unbuffered binary stdout/stderr
                const child = spawn('python', [
                    '-u',
                    '-m', 'yt_dlp', // Correct module name uses underscore
                    '-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
                    '--merge-output-format', 'mp4',
                    '-o', outputPath,
                    '--newline',
                    '--no-colors',
                    url
                ], {
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
                            // Try to find specific yt-dlp errors
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
                updateJob(job.id, { status: 'error', error: error.message || 'Başlatma hatası' })
            }
        }

        // Fire and forget
        startDownload()

        // Return job ID immediately
        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'İndirme başlatıldı'
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
        const infoCommand = `python -m yt_dlp --dump-json "${url}"`
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

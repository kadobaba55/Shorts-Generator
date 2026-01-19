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

        // Validate YouTube URL - support watch, embed, shorts, live, and youtu.be formats
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/|live\/|playlist\?)|youtu\.be\/)[\w-]+/
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

        // Start background process using Cobalt API
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

            updateJob(job.id, { status: 'processing', message: 'yt-dlp ile video indiriliyor...', queuePosition: undefined })

            try {
                // Import the cookie-based downloader
                const { downloadWithCookies, hasCookies, getCookieAge } = require('@/lib/ytdlpCookies')

                // Check if cookies are available
                if (!hasCookies()) {
                    throw new Error('Cookie dosyası bulunamadı. Admin panelinden YouTube cookie yükleyin.')
                }

                const cookieAge = getCookieAge()
                if (cookieAge > 14) {
                    console.warn(`⚠️ Cookies are ${cookieAge} days old, may need renewal`)
                }

                // Download using yt-dlp with cookies
                const downloadResult = await downloadWithCookies(
                    url,
                    outputPath,
                    (progress: number, message: string) => {
                        updateJob(job.id, { progress, message })
                    }
                )

                if (!downloadResult.success) {
                    throw new Error(downloadResult.error || 'İndirme başarısız')
                }

                const videoTitle = downloadResult.title || 'video'
                const duration = downloadResult.duration || 0

                console.log(`✅ Download complete via yt-dlp with cookies`)

                // Verify downloaded file
                if (!fs.existsSync(outputPath)) {
                    throw new Error('İndirilen dosya bulunamadı')
                }
                const fileSize = fs.statSync(outputPath).size
                console.log(`✅ File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

                // Step 2: Upload to R2
                const { uploadFileToR2 } = require('@/lib/storage')
                updateJob(job.id, { message: 'Cloudflare R2\'ye yükleniyor... ☁️', progress: 95 })

                const r2Key = `uploads/${videoId}.mp4`
                const publicUrl = await uploadFileToR2(outputPath, r2Key, 'video/mp4')
                console.log('✅ R2 upload complete:', publicUrl)

                // Delete local file
                try {
                    fs.unlinkSync(outputPath)
                    console.log('Local file deleted')
                } catch (delErr) {
                    console.warn('Could not delete local file:', delErr)
                }

                // Complete Job
                completeJob(job.id, 'download')
                updateJob(job.id, {
                    status: 'completed',
                    progress: 100,
                    result: {
                        videoId,
                        videoPath: publicUrl,
                        title: videoTitle.replace(/\.[^/.]+$/, ''), // Remove extension
                        duration: duration,
                        thumbnail: `https://img.youtube.com/vi/${extractYouTubeId(url)}/maxresdefault.jpg`
                    }
                })
                console.log('✅ Download job completed successfully')

            } catch (error: any) {
                console.error('Download error:', error)
                completeJob(job.id, 'download')
                updateJob(job.id, { status: 'error', error: error.message || 'İndirme hatası' })
            }
        }

        // Helper to extract YouTube video ID
        const extractYouTubeId = (ytUrl: string): string => {
            const match = ytUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
            return match ? match[1] : ''
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

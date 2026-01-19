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
                // NEW: Use Pure Playwright Downloader
                console.log(`🚀 Starting Playwright-only download for: ${url}`)

                // Determine cookie path
                const cookiePath = path.join(process.cwd(), 'youtube-cookies.txt')
                const scriptPath = path.join(process.cwd(), 'scripts', 'playwright-downloader.js')

                // Execute script with URL and Cookie Path
                const { stdout, stderr } = await execAsync(`node "${scriptPath}" "${url}" "${cookiePath}"`, {
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer for logs
                    timeout: 120000 // 2 minutes timeout for extraction
                })

                // Parse the JSON output from the script
                // The script might output logs before the JSON, so we find the last JSON object
                const jsonMatch = stdout.trim().split('\n').pop()
                let result
                try {
                    result = JSON.parse(jsonMatch || '{}')
                } catch (e) {
                    console.error('Failed to parse downloader output:', stdout)
                    throw new Error('Downloader script returned invalid data')
                }

                if (!result.success || !result.videoUrl) {
                    throw new Error(result.error || 'Video URL extraction failed')
                }

                console.log('✅ Streams extracted successfully')
                updateJob(job.id, { message: 'Video ve ses indiriliyor...', progress: 30 })

                // Helper to download a stream to a file
                const downloadStream = async (streamUrl: string, destPath: string) => {
                    const res = await fetch(streamUrl)
                    if (!res.ok) throw new Error(`Failed to fetch stream: ${res.statusText}`)
                    const fileStream = fs.createWriteStream(destPath)

                    // @ts-ignore
                    const { body } = res
                    if (!body) throw new Error('No body in response')

                    // Node 18 native fetch readable stream to fs write stream
                    const { Readable } = require('stream')
                    await require('stream/promises').pipeline(Readable.fromWeb(body), fileStream)
                }

                // Download Video
                const tempVideoPath = path.join(VIDEOS_DIR, `${videoId}_video.mp4`)
                await downloadStream(result.videoUrl, tempVideoPath)

                let finalFilePath = tempVideoPath

                // Download Audio if present and different
                if (result.audioUrl && result.audioUrl !== result.videoUrl) {
                    const tempAudioPath = path.join(VIDEOS_DIR, `${videoId}_audio.mp4`)
                    await downloadStream(result.audioUrl, tempAudioPath)

                    // Merge using FFmpeg
                    updateJob(job.id, { message: 'Video ve ses birleştiriliyor...', progress: 60 })
                    const mergedPath = path.join(VIDEOS_DIR, `${videoId}.mp4`)

                    await execAsync(`ffmpeg -i "${tempVideoPath}" -i "${tempAudioPath}" -c:v copy -c:a aac "${mergedPath}" -y`)

                    // Cleanup temps
                    fs.unlinkSync(tempVideoPath)
                    fs.unlinkSync(tempAudioPath)
                    finalFilePath = mergedPath
                } else {
                    // Rename video only to final path
                    const mergedPath = path.join(VIDEOS_DIR, `${videoId}.mp4`)
                    fs.renameSync(tempVideoPath, mergedPath)
                    finalFilePath = mergedPath
                }

                // Verify file
                if (!fs.existsSync(finalFilePath)) {
                    throw new Error('Final file creation failed')
                }

                const stats = fs.statSync(finalFilePath)
                console.log(`✅ File ready: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

                const videoTitle = 'Video ' + videoId
                const duration = 0 // Duration extraction would require ffprobe, skipping for speed

                // Step 2: Upload to R2
                const { uploadFileToR2 } = require('@/lib/storage')
                updateJob(job.id, { message: 'Cloudflare R2\'ye yükleniyor... ☁️', progress: 95 })

                const r2Key = `uploads/${videoId}.mp4`
                const publicUrl = await uploadFileToR2(finalFilePath, r2Key, 'video/mp4')
                console.log('✅ R2 upload complete:', publicUrl)

                // Delete local file
                try {
                    fs.unlinkSync(finalFilePath)
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
                        title: videoTitle,
                        duration: duration,
                        thumbnail: `https://img.youtube.com/vi/${extractYouTubeId(url)}/maxresdefault.jpg`
                    }
                })
                console.log('✅ Download job completed successfully')

            } catch (error: any) {
                console.error('Download error:', error)
                completeJob(job.id, 'download')
                updateJob(job.id, { status: 'error', error: error.message || 'İndirme hatası' })

                // Detailed stderr logging if available from child process error
                if (error.stderr) console.error('STDERR:', error.stderr)
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

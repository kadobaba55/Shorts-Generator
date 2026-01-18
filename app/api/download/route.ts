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
                const iosUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'

                // Use OAuth2 authentication (requires yt-dlp-youtube-oauth2 plugin)
                const infoCmd = `python3 -m yt_dlp --dump-json "${url}" --user-agent "${iosUserAgent}" --extractor-args "youtube:player_client=ios" --username oauth2 --password ""`

                updateJob(job.id, { message: 'Video bilgileri alınıyor (OAuth2)...' })
                const { stdout: infoJson } = await execAsync(infoCmd, { maxBuffer: 50 * 1024 * 1024 })
                const videoInfo = JSON.parse(infoJson)

                updateJob(job.id, { message: `İndiriliyor: ${videoInfo.title.substring(0, 30)}...` })

                let errorOutput = ''

                // Prepare args for download with OAuth2
                const args = [
                    '-u',
                    '-m', 'yt_dlp',
                    '-f', 'best[ext=mp4]/best',
                    '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    '--extractor-args', 'youtube:player_client=ios',
                    '--username', 'oauth2',
                    '--password', '',
                    '-o', outputPath,
                    '--newline',
                    '--no-colors',
                    url
                ]

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

                child.on('close', async (code) => {
                    console.log(`yt-dlp process closed with code: ${code}`)

                    if (code === 0) {
                        try {
                            // Verify downloaded file exists
                            if (!fs.existsSync(outputPath)) {
                                throw new Error(`Downloaded file not found at: ${outputPath}`)
                            }
                            const fileSize = fs.statSync(outputPath).size
                            console.log(`✅ Download complete. File: ${outputPath}, Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

                            const { uploadFileToR2 } = require('@/lib/storage')
                            updateJob(job.id, { message: 'Cloudflare R2\'ye yükleniyor... ☁️', progress: 95 })
                            console.log('Starting R2 upload...')

                            // Upload to R2
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

                            // Complete Job with Public URL
                            completeJob(job.id, 'download')

                            updateJob(job.id, {
                                status: 'completed',
                                progress: 100,
                                result: {
                                    videoId,
                                    videoPath: publicUrl,
                                    title: videoInfo.title,
                                    duration: videoInfo.duration,
                                    thumbnail: videoInfo.thumbnail
                                }
                            })
                            console.log('✅ Download job completed successfully')
                        } catch (uploadError: any) {
                            console.error('❌ R2 Upload Failed:', uploadError)
                            completeJob(job.id, 'download')
                            updateJob(job.id, { status: 'error', error: `R2 Yükleme Hatası: ${uploadError.message}` })
                        }
                    } else {
                        console.error(`❌ yt-dlp failed with code ${code}`)
                        completeJob(job.id, 'download')
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

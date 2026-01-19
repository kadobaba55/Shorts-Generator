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

            updateJob(job.id, { status: 'processing', message: 'Cobalt API ile video alınıyor...', queuePosition: undefined })

            try {
                // Step 1: Call Cobalt API to get download URL (self-hosted)
                const COBALT_API = process.env.COBALT_API_URL || 'http://localhost:9000'

                const cobaltResponse = await fetch(COBALT_API, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: url,
                        videoQuality: '1080',
                        filenameStyle: 'basic',
                        downloadMode: 'auto'
                    })
                })

                if (!cobaltResponse.ok) {
                    const errorText = await cobaltResponse.text()
                    throw new Error(`Cobalt API hatası: ${cobaltResponse.status} - ${errorText}`)
                }

                const cobaltData = await cobaltResponse.json()
                console.log('Cobalt response:', cobaltData)

                if (cobaltData.status === 'error') {
                    throw new Error(cobaltData.error?.code || 'Cobalt API bilinmeyen hata')
                }

                // Get the download URL from Cobalt response
                let downloadUrl = ''
                let videoTitle = 'video'

                if (cobaltData.status === 'tunnel' || cobaltData.status === 'redirect') {
                    downloadUrl = cobaltData.url
                    videoTitle = cobaltData.filename || 'video'
                } else if (cobaltData.status === 'picker' && cobaltData.picker?.length > 0) {
                    // For videos with multiple options, pick the first video
                    const videoOption = cobaltData.picker.find((p: any) => p.type === 'video') || cobaltData.picker[0]
                    downloadUrl = videoOption.url
                    videoTitle = videoOption.filename || 'video'
                } else {
                    throw new Error('Cobalt API geçersiz yanıt döndürdü')
                }

                updateJob(job.id, { message: `İndiriliyor: ${videoTitle.substring(0, 30)}...`, progress: 10 })

                // Step 2: Download video from Cobalt's tunnel URL using Node.js streams
                // Cobalt tunnel URLs require proper streaming - fetch doesn't work well in Next.js server
                console.log(`📥 Starting download from: ${downloadUrl.substring(0, 80)}...`)

                await new Promise<void>((resolve, reject) => {
                    const urlObj = new URL(downloadUrl)
                    const httpModule = urlObj.protocol === 'https:' ? require('https') : require('http')

                    console.log(`🔗 Using ${urlObj.protocol} module for download`)

                    const request = httpModule.get(downloadUrl, (response: any) => {
                        console.log(`📡 Response status: ${response.statusCode}`)
                        console.log(`📡 Response headers:`, JSON.stringify(response.headers).substring(0, 200))

                        // Handle redirects
                        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                            console.log(`🔄 Following redirect to: ${response.headers.location}`)
                            const redirectModule = response.headers.location.startsWith('https') ? require('https') : require('http')
                            redirectModule.get(response.headers.location, (redirectRes: any) => {
                                console.log(`📡 Redirect response status: ${redirectRes.statusCode}`)
                                handleResponse(redirectRes)
                            }).on('error', reject)
                            return
                        }

                        handleResponse(response)
                    })

                    const handleResponse = (response: any) => {
                        if (response.statusCode !== 200) {
                            console.error(`❌ Non-200 status: ${response.statusCode}`)
                            reject(new Error(`Video indirme hatası: ${response.statusCode}`))
                            return
                        }

                        const contentLength = response.headers['content-length']
                        const totalSize = contentLength ? parseInt(contentLength, 10) : 0
                        console.log(`📊 Content-Length: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`)

                        const fileStream = fs.createWriteStream(outputPath)
                        let downloadedSize = 0
                        let lastLogTime = Date.now()

                        response.on('data', (chunk: Buffer) => {
                            downloadedSize += chunk.length
                            const now = Date.now()
                            // Log progress every 2 seconds
                            if (now - lastLogTime > 2000) {
                                console.log(`📥 Downloaded: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB`)
                                lastLogTime = now
                            }
                            if (totalSize > 0) {
                                const progress = Math.round((downloadedSize / totalSize) * 80) + 10
                                updateJob(job.id, { progress })
                            }
                        })

                        response.on('end', () => {
                            console.log(`✅ Stream ended. Total downloaded: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB`)
                        })

                        response.on('error', (err: any) => {
                            console.error(`❌ Response error:`, err)
                            reject(err)
                        })

                        response.pipe(fileStream)

                        fileStream.on('finish', () => {
                            console.log(`💾 File stream finished. Closing...`)
                            fileStream.close()
                            resolve()
                        })

                        fileStream.on('error', (err: any) => {
                            console.error(`❌ File write error:`, err)
                            reject(err)
                        })
                    }

                    request.on('error', (err: any) => {
                        console.error(`❌ Request error:`, err)
                        reject(err)
                    })

                    request.setTimeout(300000, () => { // 5 min timeout
                        console.error(`❌ Request timeout after 5 minutes`)
                        request.destroy()
                        reject(new Error('Download timeout'))
                    })
                })

                // Verify downloaded file
                if (!fs.existsSync(outputPath)) {
                    throw new Error('İndirilen dosya bulunamadı')
                }
                const fileSize = fs.statSync(outputPath).size
                console.log(`✅ Download complete. File: ${outputPath}, Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

                // Step 3: Upload to R2
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

                // Get video duration using ffprobe
                let duration = 0
                try {
                    const { stdout: durationStr } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`)
                    duration = parseFloat(durationStr.trim()) || 0
                } catch (e) {
                    console.warn('Could not get duration:', e)
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

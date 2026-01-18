import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { createJob, updateJob, enqueueJob, completeJob } from '@/lib/jobs'

const execAsync = promisify(exec)

interface AnalysisResult {
    start: number
    end: number
    score: number
    reason: string
}

interface HeatmapPoint {
    start_time: number
    end_time: number
    value: number
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { videoPath, clipCount = 3, clipDuration = 30, youtubeUrl } = body

        if (!videoPath) {
            return NextResponse.json(
                { error: 'Video path gerekli' },
                { status: 400 }
            )
        }

        let inputPath = videoPath
        const isRemote = videoPath.startsWith('http')

        if (!isRemote) {
            inputPath = path.join(process.cwd(), 'public', videoPath)
            if (!fs.existsSync(inputPath)) {
                return NextResponse.json(
                    { error: 'Video bulunamadı' },
                    { status: 404 }
                )
            }
        }

        // Job Creation
        const job = createJob('analyze')
        const { canStart, position } = enqueueJob(job.id, 'analyze')

        // Background Analysis
        const startAnalysis = async () => {
            // Wait in queue if needed
            if (!canStart) {
                updateJob(job.id, {
                    status: 'queued',
                    message: `Analiz sırası bekleniyor... (${position}. sıra)`,
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

            updateJob(job.id, { status: 'processing', message: 'Video analiz ediliyor...', queuePosition: undefined })

            try {
                // Get video duration
                const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
                const { stdout: durationStr } = await execAsync(durationCmd)
                const totalDuration = parseFloat(durationStr.trim())

                let selectedClips: AnalysisResult[] = []
                let analysisMethod = 'audio'
                let heatmapWarning = ''

                // Try to get YouTube heatmap data if URL is provided
                if (youtubeUrl) {
                    try {
                        updateJob(job.id, { message: 'YouTube verileri inceleniyor...' })
                        const cookiePath = path.join(process.cwd(), 'cookies.txt')

                        // Strategy 1: Try with iOS client (often best for bypass)
                        const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'

                        // Helper to run command
                        const runYtDlp = async (useCookies: boolean) => {
                            let cmd = `python3 -m yt_dlp --dump-json "${youtubeUrl}" --user-agent "${userAgent}" --extractor-args "youtube:player_client=ios"`
                            if (useCookies && fs.existsSync(cookiePath)) {
                                cmd += ` --cookies "${cookiePath}"`
                            }
                            return execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 })
                        }

                        let videoJson = ''
                        try {
                            // Attempt 1: With cookies (if exist)
                            const res = await runYtDlp(true)
                            videoJson = res.stdout
                        } catch (e: any) {
                            const errStr = e.stderr || e.message
                            // If error is "Sign in" or "cookies", try again WITHOUT cookies
                            if (errStr.includes('Sign in') || errStr.includes('cookies')) {
                                console.log('Retrying without cookies...')
                                updateJob(job.id, { message: 'Çerezsiz deneniyor...' })
                                const res = await runYtDlp(false)
                                videoJson = res.stdout
                            } else {
                                throw e
                            }
                        }

                        const videoData = JSON.parse(videoJson)

                        // Check for heatmap data
                        const heatmap: HeatmapPoint[] = videoData.heatmap || []

                        if (heatmap.length > 0) {
                            analysisMethod = 'engagement'

                            // Find peak engagement points
                            const sortedHeatmap = [...heatmap].sort((a, b) => b.value - a.value)

                            for (const point of sortedHeatmap) {
                                if (selectedClips.length >= clipCount) break

                                // Center the clip around the peak engagement point
                                // point.start_time represents the start of the "highlighted" moment
                                // We want this moment to be in the middle of our clip
                                const halfDuration = clipDuration / 2
                                let startTime = Math.max(0, point.start_time - halfDuration)
                                const endTime = Math.min(startTime + clipDuration, totalDuration)

                                // Adjust start time if end time was clamped
                                if (endTime === totalDuration) {
                                    startTime = Math.max(0, endTime - clipDuration)
                                }

                                // Check for overlap
                                const overlaps = selectedClips.some(clip =>
                                    Math.abs(clip.start - startTime) < clipDuration
                                )

                                if (!overlaps && startTime < totalDuration - 10) {
                                    selectedClips.push({
                                        start: startTime,
                                        end: endTime,
                                        score: Math.round(point.value * 100),
                                        reason: `📊 En çok izlenen (${Math.round(point.value * 100)}% engagement)`
                                    })
                                }
                            }
                        } else {
                            heatmapWarning = 'Bu video için izlenme verisi bulunamadı. Ses analizi kullanılıyor.'
                        }
                    } catch (e) {
                        console.error('Heatmap fetch error:', e)
                        heatmapWarning = 'YouTube verisi alınamadı (Bot koruması). Ses analizi kullanılıyor.'
                    }
                }

                // Fallback to audio analysis if no heatmap clips found
                if (selectedClips.length === 0) {
                    analysisMethod = 'audio'
                    updateJob(job.id, {
                        message: '⚠️ Heatmap verisi bulunamadı. Ses analizi yapılıyor (bu işlem uzun sürebilir 5-10 dk)...',
                        progress: 0
                    })

                    // Get overall volume stats
                    const analyzeCmd = `ffmpeg -i "${inputPath}" -af "volumedetect" -vn -sn -dn -f null - 2>&1`
                    let volumeData: string
                    try {
                        const result = await execAsync(analyzeCmd, { maxBuffer: 10 * 1024 * 1024 })
                        volumeData = result.stderr || result.stdout
                    } catch (e: any) {
                        volumeData = e.stderr || e.stdout || ''
                    }

                    const meanMatch = volumeData.match(/mean_volume:\s*([-\d.]+)\s*dB/)
                    const meanVolume = meanMatch ? parseFloat(meanMatch[1]) : -20

                    // Analyze audio at intervals
                    const intervalSeconds = 5
                    const segments: { time: number; volume: number }[] = []
                    const totalSegments = Math.ceil((totalDuration - clipDuration) / intervalSeconds)
                    let processedSegments = 0

                    for (let t = 0; t < totalDuration - clipDuration; t += intervalSeconds) {
                        const segmentCmd = `ffmpeg -ss ${t} -t ${intervalSeconds} -i "${inputPath}" -af "volumedetect" -vn -sn -dn -f null - 2>&1`

                        try {
                            const result = await execAsync(segmentCmd, { timeout: 10000 })
                            const output = result.stderr || result.stdout || ''
                            const segMeanMatch = output.match(/mean_volume:\s*([-\d.]+)\s*dB/)

                            if (segMeanMatch) {
                                segments.push({
                                    time: t,
                                    volume: parseFloat(segMeanMatch[1])
                                })
                            }
                        } catch (e) {
                            segments.push({ time: t, volume: meanVolume })
                        }

                        processedSegments++
                        // Update progress periodically
                        if (processedSegments % 5 === 0) {
                            const progress = Math.round((processedSegments / totalSegments) * 100)
                            updateJob(job.id, { progress, message: `Ses analizi: %${progress}` })
                        }
                    }

                    // Sort by volume (louder = more interesting)
                    segments.sort((a, b) => b.volume - a.volume)

                    for (const segment of segments) {
                        if (selectedClips.length >= clipCount) break

                        const overlaps = selectedClips.some(clip =>
                            Math.abs(clip.start - segment.time) < clipDuration
                        )

                        if (!overlaps) {
                            // Center around the loud segment (segment.time is start of 5s chunk)
                            // We want the middle of this 5s chunk to be the middle of our clip
                            const segmentMiddle = segment.time + (intervalSeconds / 2)
                            const halfDuration = clipDuration / 2

                            let start = Math.max(0, segmentMiddle - halfDuration)
                            let end = Math.min(start + clipDuration, totalDuration)

                            // Adjust start if end was clamped
                            if (end === totalDuration) {
                                start = Math.max(0, end - clipDuration)
                            }
                            selectedClips.push({
                                start: start,
                                end: end,
                                score: Math.round((segment.volume + 50) * 2),
                                reason: segment.volume > meanVolume + 5 ? '🔊 Yüksek ses seviyesi' :
                                    segment.volume > meanVolume ? '🔉 Orta ses seviyesi' : '🔈 Normal ses'
                            })
                        }
                    }
                }

                // Sort by time for display
                selectedClips.sort((a, b) => a.start - b.start)

                completeJob(job.id, 'analyze')

                updateJob(job.id, {
                    status: 'completed',
                    progress: 100,
                    result: {
                        success: true,
                        totalDuration,
                        analysisMethod,
                        clips: selectedClips,
                        warning: heatmapWarning,
                        message: analysisMethod === 'engagement'
                            ? `📊 ${selectedClips.length} popüler an tespit edildi (YouTube verisi)`
                            : `🔊 ${selectedClips.length} ilgi çekici an tespit edildi (ses analizi)`
                    }
                })

            } catch (error: any) {
                console.error('Analysis job error:', error)
                completeJob(job.id, 'analyze')
                updateJob(job.id, { status: 'error', error: error.message || 'Analiz hatası' })
            }
        }

        // Fire and forget
        startAnalysis()

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: canStart ? 'Analiz başlatıldı' : `Sırada bekleniyor (${position}. sıra)`,
            queued: !canStart,
            queuePosition: position
        })

    } catch (error: any) {
        console.error('Analysis error:', error)
        return NextResponse.json(
            { error: error.message || 'Analiz hatası' },
            { status: 500 }
        )
    }
}

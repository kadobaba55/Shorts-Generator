import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

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
        const { videoPath, clipCount = 3, clipDuration = 30, youtubeUrl } = await request.json()

        if (!videoPath) {
            return NextResponse.json(
                { error: 'Video path gerekli' },
                { status: 400 }
            )
        }

        const inputPath = path.join(process.cwd(), 'public', videoPath)

        if (!fs.existsSync(inputPath)) {
            return NextResponse.json(
                { error: 'Video bulunamadı' },
                { status: 404 }
            )
        }

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
                const heatmapCmd = `python -m yt_dlp --dump-json "${youtubeUrl}"`
                const { stdout: videoJson } = await execAsync(heatmapCmd, { maxBuffer: 50 * 1024 * 1024 })
                const videoData = JSON.parse(videoJson)

                // Check for heatmap data
                const heatmap: HeatmapPoint[] = videoData.heatmap || []

                if (heatmap.length > 0) {
                    analysisMethod = 'engagement'

                    // Find peak engagement points
                    const sortedHeatmap = [...heatmap].sort((a, b) => b.value - a.value)

                    for (const point of sortedHeatmap) {
                        if (selectedClips.length >= clipCount) break

                        const startTime = point.start_time
                        const endTime = Math.min(startTime + clipDuration, totalDuration)

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
                heatmapWarning = 'YouTube verisi alınamadı. Ses analizi kullanılıyor.'
            }
        }

        // Fallback to audio analysis if no heatmap clips found
        if (selectedClips.length === 0) {
            analysisMethod = 'audio'

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
            }

            // Sort by volume (louder = more interesting)
            segments.sort((a, b) => b.volume - a.volume)

            for (const segment of segments) {
                if (selectedClips.length >= clipCount) break

                const overlaps = selectedClips.some(clip =>
                    Math.abs(clip.start - segment.time) < clipDuration
                )

                if (!overlaps) {
                    const clipEnd = Math.min(segment.time + clipDuration, totalDuration)
                    selectedClips.push({
                        start: segment.time,
                        end: clipEnd,
                        score: Math.round((segment.volume + 50) * 2),
                        reason: segment.volume > meanVolume + 5 ? '🔊 Yüksek ses seviyesi' :
                            segment.volume > meanVolume ? '🔉 Orta ses seviyesi' : '🔈 Normal ses'
                    })
                }
            }
        }

        // Sort by time for display
        selectedClips.sort((a, b) => a.start - b.start)

        return NextResponse.json({
            success: true,
            totalDuration,
            analysisMethod,
            clips: selectedClips,
            warning: heatmapWarning,
            message: analysisMethod === 'engagement'
                ? `📊 ${selectedClips.length} popüler an tespit edildi (YouTube verisi)`
                : `🔊 ${selectedClips.length} ilgi çekici an tespit edildi (ses analizi)`
        })

    } catch (error: any) {
        console.error('Analysis error:', error)
        return NextResponse.json(
            { error: error.message || 'Analiz hatası' },
            { status: 500 }
        )
    }
}

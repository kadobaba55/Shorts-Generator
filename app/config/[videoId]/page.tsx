'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import ConfigStep from '@/components/ConfigStep'
import {
    formatTimeRemaining,
    estimateAnalyzeTime,
    estimateRenderTime
} from '@/lib/estimateTime'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'
import { extractVideoId } from '@/lib/youtubeHeatmap'

interface VideoData {
    videoPath: string
    title: string
    duration: number
    url?: string
}

interface Clip {
    id: string
    start: number
    end: number
}

export default function ConfigPage() {
    const router = useRouter()
    const params = useParams()
    const videoId = params.videoId as string
    const { data: session } = useSession()
    const { t } = useLanguage()

    // Video Data (from localStorage)
    const [videoData, setVideoData] = useState<VideoData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Config State
    const [language, setLanguage] = useState('tr')
    const [whisperModel, setWhisperModel] = useState<'tiny' | 'base' | 'small' | 'medium'>('tiny')
    const [mode, setMode] = useState<'auto' | 'manual'>('auto')
    const [clipCount, setClipCount] = useState(3)
    const [clipDuration, setClipDuration] = useState(30)
    const [manualClips, setManualClips] = useState<{ start: number; end: number; id: string }[]>([])

    // Processing State
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analyzeETA, setAnalyzeETA] = useState('')
    const [statusMessage, setStatusMessage] = useState('')

    // Load video data from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(`kadostudio_video_${videoId}`)
            if (stored) {
                setVideoData(JSON.parse(stored))
            } else {
                toast.error('Video bulunamadı')
                router.push('/')
            }
        } catch (e) {
            console.error('Failed to load video data:', e)
            router.push('/')
        } finally {
            setIsLoading(false)
        }
    }, [videoId, router])

    // Handle config submit
    const handleConfigSubmit = async () => {
        if (!videoData) return

        setIsAnalyzing(true)
        const startTime = Date.now()
        const totalEstimate = estimateAnalyzeTime(videoData.duration) + estimateRenderTime(videoData.duration, clipCount)

        try {
            let clips = []

            if (mode === 'auto') {
                // Step 1: Analyze video (Only for AUTO mode)
                toast.loading('Video analiz ediliyor...', { id: 'processing' })

                // Try to fetch YouTube heatmap data via server-side API (bypasses CORS)
                let heatmapData = null
                if (videoData.url) {
                    const ytVideoId = extractVideoId(videoData.url)
                    if (ytVideoId) {
                        try {
                            toast.loading('YouTube heatmap verisi alınıyor...', { id: 'processing' })
                            const heatmapRes = await fetch('/api/heatmap', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ videoId: ytVideoId })
                            })
                            const { heatmap } = await heatmapRes.json()
                            if (heatmap && heatmap.heatMarkers?.length > 0) {
                                // Convert to the format expected by analyze API
                                heatmapData = heatmap.heatMarkers.map((m: any) => ({
                                    start_time: m.startMillis / 1000,
                                    end_time: m.endMillis / 1000,
                                    value: m.intensityScoreNormalized
                                }))
                                console.log('Heatmap fetched:', heatmapData.length, 'points')
                            }
                        } catch (err) {
                            console.warn('Could not fetch heatmap:', err)
                        }
                    }
                }

                const analyzeRes = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoPath: videoData.videoPath,
                        clipCount,
                        clipDuration,
                        youtubeUrl: videoData.url,
                        heatmap: heatmapData
                    })
                })

                if (!analyzeRes.ok) {
                    const err = await analyzeRes.json()
                    throw new Error(err.error || 'Analiz başlatılamadı')
                }

                const { jobId: analyzeJobId } = await analyzeRes.json()

                // Poll for analysis completion
                clips = await pollForCompletion(analyzeJobId, 'analysis')
            } else {
                // MANUAL MODE: Use user defined clips directly
                if (manualClips.length === 0) {
                    toast.error('Lütfen en az bir klip ekleyin')
                    setIsAnalyzing(false)
                    return
                }
                clips = manualClips
            }

            toast.loading('Klipler oluşturuluyor...', { id: 'processing' })

            // Step 2: Process/Render clips
            const processRes = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: videoData.videoPath,
                    clips: clips,
                    addSubtitles: false
                })
            })

            if (!processRes.ok) {
                const err = await processRes.json()
                throw new Error(err.error || 'İşlem başlatılamadı')
            }

            const { jobId: processJobId } = await processRes.json()

            // Poll for processing completion
            const processResult = await pollForCompletion(processJobId, 'process')

            // Save processed clips to localStorage
            const editorData = {
                videoPath: videoData.videoPath,
                title: videoData.title,
                clips: processResult.clips,
                originalClips: clips,
                timestamp: Date.now()
            }
            localStorage.setItem(`kadostudio_editor_${videoId}`, JSON.stringify(editorData))

            toast.success('Klipler hazır!', { id: 'processing' })

            // Navigate to editor
            router.push(`/editor/${videoId}`)

        } catch (error: any) {
            console.error('Config submit error:', error)
            toast.error(error.message || 'Bir hata oluştu', { id: 'processing' })
            setIsAnalyzing(false)
        }
    }

    // Poll for job completion
    const pollForCompletion = (jobId: string, type: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            console.log(`[Poll] Starting polling for ${type} job: ${jobId}`)
            const interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/status?id=${jobId}`)
                    if (!res.ok) {
                        console.log(`[Poll] Status API returned ${res.status}`)
                        return
                    }

                    const job = await res.json()
                    console.log(`[Poll] ${type} Job Status:`, job.status, job.progress || '')

                    if (job.status === 'completed') {
                        console.log(`[Poll] ✅ ${type} completed!`, job.result)
                        clearInterval(interval)
                        if (type === 'analysis') {
                            resolve(job.result?.clips || [])
                        } else {
                            resolve(job.result || {})
                        }
                    } else if (job.status === 'error') {
                        console.log(`[Poll] ❌ ${type} error:`, job.error)
                        clearInterval(interval)
                        reject(new Error(job.error || `${type} failed`))
                    } else {
                        // Update status message and progress
                        if (job.message) {
                            setStatusMessage(job.message)
                        }
                        if (job.progress > 0) {
                            const remaining = ((100 - job.progress) / job.progress) * 2 // rough estimate
                            setAnalyzeETA(formatTimeRemaining(remaining))
                        }
                    }
                } catch (e) {
                    console.error('Polling error:', e)
                }
            }, 1000)

            // Timeout after 10 minutes
            setTimeout(() => {
                clearInterval(interval)
                reject(new Error('İşlem zaman aşımına uğradı'))
            }, 10 * 60 * 1000)
        })
    }

    const handleBack = () => {
        router.push('/')
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-bg-terminal text-white flex items-center justify-center">
                <div className="font-mono text-neon-green animate-pulse">Loading...</div>
            </main>
        )
    }

    if (!videoData) {
        return null
    }

    return (
        <main className="min-h-screen bg-bg-terminal text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="relative w-14 h-14 hover:opacity-80 transition-opacity">
                            <Image
                                src="/logo_final.png"
                                alt="Kadostudio"
                                fill
                                className="object-contain"
                                priority
                            />
                        </Link>
                        <div className="font-mono text-xs text-neon-amber">
                            {t('config.title')}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {session && (
                            <div className="font-mono text-xs text-neon-green hidden md:block">
                                {session.user?.tokens} {t('nav.credits')}
                            </div>
                        )}
                        <LanguageSwitcher />
                    </div>
                </div>
            </header>



            {/* Content */}
            <div className="container mx-auto px-4 pb-12">
                <ConfigStep
                    videoInfo={{ title: videoData.title, duration: videoData.duration }}
                    language={language}
                    setLanguage={setLanguage}
                    whisperModel={whisperModel}
                    setWhisperModel={setWhisperModel}
                    mode={mode}
                    setMode={setMode}
                    clipCount={clipCount}
                    setClipCount={setClipCount}
                    clipDuration={clipDuration}
                    setClipDuration={setClipDuration}
                    manualClips={manualClips}
                    setManualClips={setManualClips}
                    onSubmit={handleConfigSubmit}
                    onBack={handleBack}
                    isAnalyzing={isAnalyzing}
                    estimatedTimeRemaining={analyzeETA}
                    statusMessage={statusMessage}
                />
            </div>
        </main>
    )
}

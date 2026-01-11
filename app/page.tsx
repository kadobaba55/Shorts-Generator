'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import Hero from '@/components/Hero'
import ConfigStep from '@/components/ConfigStep'
import VideoEditor from '@/components/VideoEditor'
import {
    formatTimeRemaining,
    estimateDownloadTime,
    estimateRenderTime,
    estimateAnalyzeTime,
    calculateRemainingTime
} from '@/lib/estimateTime'

interface Clip {
    id: string
    start: number
    end: number
}

interface ProcessedClip {
    id: string
    videoPath: string
    subtitledPath?: string
    start: number
    end: number
    duration: number
    hasSubtitles: boolean
    isProcessing: boolean
}

export default function Home() {
    const { data: session, update } = useSession()

    // Step Management
    const [step, setStep] = useState(0)

    // Video State
    const [url, setUrl] = useState('')
    const [videoSrc, setVideoSrc] = useState<string | null>(null)
    const [videoInfo, setVideoInfo] = useState<{ title: string; duration: number } | null>(null)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [isDownloading, setIsDownloading] = useState(false)

    // Config State
    const [language, setLanguage] = useState('tr')
    const [whisperModel, setWhisperModel] = useState<'tiny' | 'base' | 'small' | 'medium'>('tiny')
    const [mode, setMode] = useState<'auto' | 'manual'>('auto')
    const [clipCount, setClipCount] = useState(3)
    const [clipDuration, setClipDuration] = useState(30)

    // Processing State
    const [clips, setClips] = useState<Clip[]>([])
    const [processedClips, setProcessedClips] = useState<ProcessedClip[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isGeneratingClips, setIsGeneratingClips] = useState(false)
    const [processProgress, setProcessProgress] = useState(0)

    // Additional Settings
    const [addEmoji, setAddEmoji] = useState(true)
    const [highlightKeywords, setHighlightKeywords] = useState(true)
    const [subtitleStyle, setSubtitleStyle] = useState('classic')

    // ETA States
    const [downloadStartTime, setDownloadStartTime] = useState<number>(0)
    const [downloadTotalEstimate, setDownloadTotalEstimate] = useState<number>(0)
    const [downloadETA, setDownloadETA] = useState<string>('')

    const [processStartTime, setProcessStartTime] = useState<number>(0)
    const [processTotalEstimate, setProcessTotalEstimate] = useState<number>(0)
    const [processETA, setProcessETA] = useState<string>('')

    const [analyzeStartTime, setAnalyzeStartTime] = useState<number>(0)
    const [analyzeTotalEstimate, setAnalyzeTotalEstimate] = useState<number>(0)
    const [analyzeETA, setAnalyzeETA] = useState<string>('')

    // Download Video
    const handleDownload = async (videoUrl: string) => {
        console.log('Starting download:', videoUrl)
        setIsDownloading(true)
        setDownloadProgress(0)
        setDownloadStartTime(Date.now())
        setDownloadETA('Hesaplanıyor...')

        try {
            // Start download job
            const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoUrl })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Download failed')
            }

            const { jobId } = await res.json()
            console.log('Download started, Job ID:', jobId)

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/status?id=${jobId}`)
                    if (!statusRes.ok) return

                    const job = await statusRes.json()
                    console.log('Download Job Status:', job)

                    if (job.status === 'processing') {
                        setDownloadProgress(job.progress)
                        if (job.eta) {
                            setDownloadETA(job.eta)
                        } else {
                            // Fallback estimation if ETA not provided by yt-dlp yet
                            const elapsed = (Date.now() - job.startTime) / 1000
                            if (job.progress > 0) {
                                const totalTime = elapsed / (job.progress / 100)
                                const remaining = totalTime - elapsed
                                setDownloadETA(formatTimeRemaining(remaining))
                            }
                        }
                    } else if (job.status === 'completed') {
                        clearInterval(pollInterval)
                        setDownloadProgress(100)
                        setDownloadETA('Tamamlandı!')

                        const { videoPath, title, duration } = job.result
                        setVideoSrc(videoPath)
                        setVideoInfo({ title, duration })

                        toast.success('Video indirildi!')
                        setTimeout(() => setStep(1), 1000)
                    } else if (job.status === 'error') {
                        clearInterval(pollInterval)
                        throw new Error(job.error || 'İndirme hatası')
                    }
                } catch (e) {
                    console.error('Polling error:', e)
                    // Don't stop polling on transient network errors, but maybe limit retries in prod
                }
            }, 1000)

        } catch (error: any) {
            console.error('Download error:', error)
            toast.error(error.message || 'İndirme hatası')
            setDownloadProgress(0)
            setDownloadETA('')
            setIsDownloading(false)
        }
    }

    // Analyze Video (AI Mode)
    const analyzeVideo = async (videoPath: string) => {
        console.log('Analyzing video:', videoPath)
        setIsAnalyzing(true)
        setAnalyzeStartTime(Date.now())

        // Video süresine göre analiz süresi tahmini
        if (videoInfo) {
            setAnalyzeTotalEstimate(estimateAnalyzeTime(videoInfo.duration))
        } else {
            setAnalyzeTotalEstimate(10) // Varsayılan 10s
        }

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: videoPath,
                    clipCount,
                    clipDuration,
                    youtubeUrl: url.includes('youtube.com') || url.includes('youtu.be') ? url : undefined
                })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Analiz başlatılamadı')
            }

            const { jobId, message } = await res.json()
            console.log('Analysis started, Job ID:', jobId)
            toast.loading(message, { id: 'analysis' })

            // Return promise that resolves with clips
            return new Promise<Clip[]>((resolve, reject) => {
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await fetch(`/api/status?id=${jobId}`)
                        if (!statusRes.ok) return

                        const job = await statusRes.json()
                        // Update ETA if possible
                        if (job.progress > 0) {
                            const elapsed = (Date.now() - job.startTime) / 1000
                            const total = elapsed / (job.progress / 100)
                            setAnalyzeETA(Math.ceil(total - elapsed) + 's')
                        }

                        if (job.status === 'processing') {
                            if (job.queuePosition) {
                                toast.loading(`Sırada bekleniyor (${job.queuePosition}. sıra)...`, { id: 'analysis' })
                            } else {
                                toast.loading(job.message || 'Analiz ediliyor...', { id: 'analysis' })
                            }
                        } else if (job.status === 'completed') {
                            clearInterval(pollInterval)
                            const resultClips = job.result?.clips || []
                            setClips(resultClips)

                            toast.success(`${resultClips.length} klip bulundu!`, { id: 'analysis' })
                            setIsAnalyzing(false)
                            setAnalyzeETA('')
                            resolve(resultClips)

                        } else if (job.status === 'error') {
                            clearInterval(pollInterval)
                            toast.error(job.error || 'Analiz hatası', { id: 'analysis' })
                            setIsAnalyzing(false)
                            reject(new Error(job.error))
                        }
                    } catch (e) {
                        console.error('Polling error:', e)
                    }
                }, 1000)
            })

        } catch (error: any) {
            console.error('Analysis error:', error)
            toast.error(error.message, { id: 'analysis' })
            setIsAnalyzing(false)
            setAnalyzeETA('')
            return []
        }
    }

    // Handle Config Submit
    const handleConfigSubmit = async () => {
        console.log('Config submit - videoSrc:', videoSrc)

        if (!videoSrc) {
            toast.error('Video bulunamadı. Lütfen önce video indirin.')
            setStep(0)
            return
        }

        setStep(2) // Move to editor first

        let clipsToUse = clips
        if (mode === 'auto') {
            clipsToUse = await analyzeVideo(videoSrc) // Wait for AI analysis
        }

        // Then start processing with the video path
        await handleProcess(videoSrc, clipsToUse)
    }

    // Process Clips
    const handleProcess = async (videoPath: string, clipsToProcess?: Clip[]) => {
        console.log('handleProcess called', { videoPath, clipsToProcess, clipCount, clipDuration })

        if (!videoPath) {
            console.error('No video source found')
            toast.error('Video bulunamadı. Lütfen önce video indirin.')
            setStep(0) // Go back to hero
            return
        }

        // Use provided clips or current state clips
        let finalClips = clipsToProcess || clips

        // If no clips, create a default clip
        if (finalClips.length === 0) {
            console.log('Creating default clip')
            const defaultClip: Clip = {
                id: 'clip-default',
                start: 0,
                end: Math.min(clipDuration, videoInfo?.duration || 30)
            }
            finalClips = [defaultClip]
            setClips([defaultClip])
        }

        console.log('Processing clips:', finalClips)

        setIsGeneratingClips(true)
        setProcessProgress(0)
        setProcessedClips([])
        setProcessStartTime(Date.now())

        // Render süresi tahmini
        const estimatedRenderTime = estimateRenderTime(finalClips.length, clipDuration)
        setProcessTotalEstimate(estimatedRenderTime)

        try {
            setProcessProgress(10)
            toast.loading('Klipler oluşturuluyor...', { id: 'processing' })

            const processRes = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: videoPath, clips: finalClips, addSubtitles: false })
            })

            if (!processRes.ok) {
                const errorData = await processRes.json()
                throw new Error(errorData.error || 'İşlem hatası')
            }

            const { jobId } = await processRes.json()

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/status?id=${jobId}`)
                    if (!statusRes.ok) return

                    const job = await statusRes.json()

                    if (job.status === 'processing') {
                        setProcessProgress(job.progress)
                        if (job.eta) setProcessETA(job.eta) // Backend'den gelirse kullan
                        else {
                            // Basit tahmin
                            const elapsed = (Date.now() - job.startTime) / 1000
                            if (job.progress > 0) {
                                const total = elapsed / (job.progress / 100)
                                setProcessETA(Math.ceil(total - elapsed) + 's')
                            }
                        }

                    } else if (job.status === 'completed') {
                        clearInterval(pollInterval)
                        setProcessProgress(100)
                        setProcessETA('Tamamlandı!')

                        // job.result.clips kontrolü
                        const resultClips = job.result?.clips || []

                        const newProcessedClips: ProcessedClip[] = resultClips.map((clipPath: string, index: number) => ({
                            id: `clip-${Date.now()}-${index}`,
                            videoPath: clipPath,
                            start: finalClips[index]?.start || 0,
                            end: finalClips[index]?.end || clipDuration,
                            duration: (finalClips[index]?.end || clipDuration) - (finalClips[index]?.start || 0),
                            hasSubtitles: false,
                            isProcessing: false
                        }))

                        setProcessedClips(newProcessedClips)
                        setIsGeneratingClips(false)
                        toast.success('Klipler oluşturuldu!', { id: 'processing' })
                    } else if (job.status === 'error') {
                        clearInterval(pollInterval)
                        throw new Error(job.error || 'Render hatası')
                    }
                } catch (e: any) {
                    console.error('Polling error:', e)
                    // Hata olursa döngüyü kırma, devam et (geçici ağ hatası olabilir)
                    // Ancak error throw edilirse catch bloğuna düşer ve ana interval dışarıda olduğu için durmaz.
                    // Burada throw edince aşağıdaki catch yakalamaz çünkü async callback içindeyiz.
                    // O yüzden error state'i handle edilmeli.
                    if (e.message.includes('Render hatası')) {
                        clearInterval(pollInterval)
                        setIsGeneratingClips(false)
                        toast.error(e.message, { id: 'processing' })
                    }
                }
            }, 1000)

        } catch (error: any) {
            console.error('Process error:', error)
            toast.error(error.message, { id: 'processing' })
            setIsGeneratingClips(false)
            setProcessETA('')
        }
    }

    // Add Subtitles to Clip
    const addSubtitlesToClip = async (clipIndex: number) => {
        const clip = processedClips[clipIndex]
        if (!clip || clip.isProcessing) return

        setProcessedClips(prev => prev.map((c, i) =>
            i === clipIndex ? { ...c, isProcessing: true } : c
        ))

        toast.loading(`Klip ${clipIndex + 1} için altyazı ekleniyor...`, { id: `subtitle-${clipIndex}` })

        try {
            const subRes = await fetch('/api/subtitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: clip.videoPath,
                    language,
                    style: subtitleStyle,
                    model: whisperModel,
                    addEmojis: addEmoji,
                    highlightKeywords: highlightKeywords
                })
            })

            if (!subRes.ok) throw new Error('Altyazı eklenemedi')

            const subData = await subRes.json()

            setProcessedClips(prev => prev.map((c, i) =>
                i === clipIndex ? {
                    ...c,
                    subtitledPath: subData.outputPath,
                    hasSubtitles: true,
                    isProcessing: false
                } : c
            ))

            toast.success(`Klip ${clipIndex + 1} altyazı eklendi!`, { id: `subtitle-${clipIndex}` })
            await update()

        } catch (error: any) {
            toast.error(error.message, { id: `subtitle-${clipIndex}` })
            setProcessedClips(prev => prev.map((c, i) =>
                i === clipIndex ? { ...c, isProcessing: false } : c
            ))
        }
    }

    // Add Subtitles to All Clips
    const addSubtitlesToAll = async () => {
        for (let i = 0; i < processedClips.length; i++) {
            if (!processedClips[i].hasSubtitles) {
                await addSubtitlesToClip(i)
            }
        }
    }

    // Analyze ETA Update (Only one remaining since Download and Process use real-time polling)
    useEffect(() => {
        if (!isAnalyzing || !analyzeStartTime) return

        const interval = setInterval(() => {
            // Analiz için progress bar yok, zamana dayalı tahmin (hala simülasyon çünkü analyze API değişmedi)
            const elapsed = (Date.now() - analyzeStartTime) / 1000
            const remaining = Math.max(0, analyzeTotalEstimate - elapsed)
            setAnalyzeETA(formatTimeRemaining(remaining))
        }, 1000)

        return () => clearInterval(interval)
    }, [isAnalyzing, analyzeStartTime, analyzeTotalEstimate])

    return (
        <main className="min-h-screen bg-bg-terminal text-white relative">

            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Logo Icon */}
                        <Link href="/" className="relative w-14 h-14 hover:opacity-80 transition-opacity animate-pulse-slow">
                            <Image
                                src="/logo_final.png"
                                alt="Tidal Feynman"
                                fill
                                className="object-contain"
                                priority
                            />
                        </Link>

                        {/* Step Indicator */}
                        {step > 0 && (
                            <div className="font-mono text-xs text-neon-amber">
                                [ STEP {step}/2 ]
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/pricing" className="hidden md:block font-mono text-xs text-gray-500 hover:text-neon-cyan transition-colors border border-neon-cyan/30 px-3 py-1 rounded hover:bg-neon-cyan/5">
                            [ UPGRADE_SYSTEM ]
                        </Link>
                        {session ? (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-3 border border-neon-green/30 px-4 py-2 hover:border-neon-green hover:bg-neon-green/10 transition-all"
                                >
                                    <div className="w-8 h-8 border-2 border-neon-green flex items-center justify-center font-pixel text-xs text-neon-green">
                                        {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                                    </div>
                                    <div className="flex flex-col items-start font-mono text-xs">
                                        <span className="text-neon-green">{session.user?.name}</span>
                                        <span className="text-neon-amber">{session.user?.tokens} CREDITS</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="font-mono text-xs text-gray-500 hover:text-neon-red transition-colors"
                                >
                                    [LOGOUT]
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="font-mono text-sm text-neon-green hover:text-neon-amber transition-colors">
                                    [LOGIN]
                                </Link>
                                <Link href="/register" className="btn-secondary text-sm px-4 py-2">
                                    REGISTER
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="container mx-auto px-4 pb-12">
                {step === 0 && (
                    <Hero
                        onVideoSubmit={handleDownload}
                        isDownloading={isDownloading}
                        downloadProgress={downloadProgress}
                        estimatedTimeRemaining={downloadETA}
                    />
                )}

                {step === 1 && (
                    <ConfigStep
                        videoInfo={videoInfo}
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
                        onSubmit={handleConfigSubmit}
                        onBack={() => setStep(0)}
                        isAnalyzing={isAnalyzing}
                        estimatedTimeRemaining={analyzeETA}
                    />
                )}

                {step === 2 && (
                    <VideoEditor
                        processedClips={processedClips}
                        setProcessedClips={setProcessedClips}
                        isGeneratingClips={isGeneratingClips}
                        isAnalyzing={isAnalyzing}
                        processProgress={processProgress}
                        onBack={() => setStep(1)}
                        onAddSubtitles={addSubtitlesToClip}
                        onAddSubtitlesToAll={addSubtitlesToAll}
                        estimatedTimeRemaining={processETA}
                    />
                )}
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-6 mt-20 bg-bg-card">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-gray-500">
                                Made by <span className="text-neon-green">KADO</span>
                            </span>
                        </div>
                        <div className="font-mono text-xs text-gray-600">
                            © 2026 v2.0.0 | All rights reserved
                        </div>
                        <div className="flex items-center gap-6 font-mono text-xs">
                            <Link href="/pricing" className="text-gray-500 hover:text-neon-amber transition-colors">
                                [PRICING]
                            </Link>
                            <Link href="/profile" className="text-gray-500 hover:text-neon-cyan transition-colors">
                                [PROFILE]
                            </Link>
                            {(session?.user as any)?.role === 'ADMIN' && (
                                <Link href="/admin" className="text-gray-500 hover:text-neon-magenta transition-colors">
                                    [ADMIN]
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    )
}


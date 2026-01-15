'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import VideoEditor from '@/components/VideoEditor'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'

interface ProcessedClip {
    id: string
    videoPath: string
    originalUrl?: string // The ORIGINAL clean video without subtitles
    subtitledPath?: string
    start: number
    end: number
    duration: number
    hasSubtitles: boolean
    isProcessing: boolean
    paddingStart?: number
    trimStart?: number
    trimEnd?: number
    subtitleSegments?: any[]
    subtitleStyle?: any
    // New editable properties
    fadeIn?: number
    fadeOut?: number
    volume?: number
    speed?: number
}

interface EditorData {
    videoPath: string
    title: string
    clips: string[]
    originalClips: { id: string; start: number; end: number }[]
    timestamp: number
}

export default function EditorPage() {
    const router = useRouter()
    const params = useParams()
    const videoId = params.videoId as string

    const { data: session } = useSession()
    const { t } = useLanguage()

    const [processedClips, setProcessedClips] = useState<ProcessedClip[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editorData, setEditorData] = useState<EditorData | null>(null)

    // Load editor data from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(`kadostudio_editor_${videoId}`)
            if (stored) {
                const data: EditorData = JSON.parse(stored)
                setEditorData(data)

                // Convert clips to ProcessedClip format
                const clips: ProcessedClip[] = data.clips.map((clipDataRaw, index) => {
                    let videoPath = clipDataRaw
                    let originalUrl = clipDataRaw // Track original clean video
                    let subtitledPath: string | undefined = undefined
                    let paddingStart = 0

                    let hasSubtitles = false
                    let subtitleSegments: any[] = []
                    let subtitleStyle: any = undefined

                    try {
                        const parsed = JSON.parse(clipDataRaw)
                        if (parsed.url) {
                            // originalUrl is the clean video without subtitles
                            originalUrl = parsed.originalUrl || parsed.url
                            subtitledPath = parsed.subtitledPath
                            // For preview, use subtitled version if available
                            videoPath = subtitledPath || parsed.url
                            paddingStart = parsed.paddingStart || 0
                            hasSubtitles = parsed.hasSubtitles || false
                            subtitleSegments = parsed.subtitleSegments || []
                            subtitleStyle = parsed.subtitleStyle
                        }
                    } catch (e) {
                        // Not JSON, assume string URL
                        originalUrl = clipDataRaw
                    }

                    const originalStart = data.originalClips[index]?.start || 0
                    const originalEnd = data.originalClips[index]?.end || 30
                    const duration = originalEnd - originalStart

                    return {
                        id: `clip_${index + 1}`,
                        videoPath: videoPath, // For preview - uses subtitledPath if available
                        originalUrl: originalUrl, // Original clean video for re-burning
                        subtitledPath: subtitledPath,
                        start: originalStart,
                        end: originalEnd,
                        duration: duration,
                        hasSubtitles: hasSubtitles,
                        isProcessing: false,
                        paddingStart: paddingStart,
                        trimStart: paddingStart,
                        trimEnd: paddingStart + duration,
                        subtitleSegments: subtitleSegments,
                        subtitleStyle: subtitleStyle
                    }
                })
                setProcessedClips(clips)
            } else {
                toast.error('Klip verisi bulunamadı')
                router.push('/')
            }
        } catch (e) {
            console.error('Failed to load editor data:', e)
            router.push('/')
        } finally {
            setIsLoading(false)
        }
    }, [videoId, router])

    // Add subtitles to single clip
    const handleAddSubtitles = async (clipIndex: number) => {
        const clip = processedClips[clipIndex]
        if (!clip || clip.isProcessing) return

        setProcessedClips(prev => prev.map((c, i) =>
            i === clipIndex ? { ...c, isProcessing: true } : c
        ))

        toast.loading(`Klip ${clipIndex + 1} için altyazı ekleniyor...`, { id: `subtitle-${clipIndex}` })

        try {
            // This will open subtitle editor or directly add
            // For now, we'll just mark as done - the actual subtitle logic is in VideoEditor
            toast.success(`Altyazı için SubtitleEditor açılıyor`, { id: `subtitle-${clipIndex}` })
        } catch (error: any) {
            console.error('Subtitle error:', error)
            toast.error(error.message || 'Altyazı hatası', { id: `subtitle-${clipIndex}` })
        } finally {
            setProcessedClips(prev => prev.map((c, i) =>
                i === clipIndex ? { ...c, isProcessing: false } : c
            ))
        }
    }

    // Add subtitles to all clips
    const handleAddSubtitlesToAll = async () => {
        for (let i = 0; i < processedClips.length; i++) {
            await handleAddSubtitles(i)
        }
    }

    const handleBack = () => {
        router.push(`/config/${videoId}`)
    }

    if (isLoading) {
        return (
            <main className="min-h-screen bg-bg-terminal text-white flex items-center justify-center">
                <div className="font-mono text-neon-green animate-pulse">Loading editor...</div>
            </main>
        )
    }

    if (!editorData || processedClips.length === 0) {
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
                            [ STEP 2/2 - EDITOR ]
                        </div>
                        <div className="font-mono text-xs text-gray-500 hidden md:block truncate max-w-xs">
                            {editorData.title}
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
                <VideoEditor
                    processedClips={processedClips}
                    setProcessedClips={setProcessedClips}
                    isGeneratingClips={false}
                    isAnalyzing={false}
                    processProgress={100}
                    onBack={handleBack}
                    onAddSubtitles={handleAddSubtitles}
                    onAddSubtitlesToAll={handleAddSubtitlesToAll}
                />
            </div>
        </main>
    )
}

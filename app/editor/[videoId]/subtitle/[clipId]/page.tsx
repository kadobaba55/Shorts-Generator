'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SubtitlePage, { SubtitleSegment, SubtitleStyle } from '@/components/SubtitlePage'
import { toast } from 'react-hot-toast'

interface ProcessedClip {
    id: string
    videoPath: string
    subtitledPath?: string
    start: number
    end: number
    duration: number
    hasSubtitles: boolean
    isProcessing: boolean
    paddingStart?: number
    trimStart?: number
    trimEnd?: number
    subtitleSegments?: SubtitleSegment[]
    subtitleStyle?: SubtitleStyle
}

interface EditorData {
    videoPath: string
    title: string
    clips: any[] // We parse this carefully
    originalClips: any[]
}

export default function SubtitleStudioPage() {
    const params = useParams()
    const router = useRouter()
    const videoId = params.videoId as string
    const clipId = params.clipId as string // e.g. "clip_1"

    const [clip, setClip] = useState<ProcessedClip | null>(null)
    const [clipIndex, setClipIndex] = useState<number>(-1)
    const [isLoading, setIsLoading] = useState(true)

    // Load data from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(`kadostudio_editor_${videoId}`)
            if (stored) {
                const data: EditorData = JSON.parse(stored)

                // We need to match the clipId.
                // In EditorPage, we generate IDs like `clip_${index + 1}`.
                const index = parseInt(clipId.replace('clip_', '')) - 1

                if (isNaN(index) || index < 0 || index >= data.clips.length) {
                    toast.error('Klip bulunamadı')
                    router.push(`/editor/${videoId}`)
                    return
                }

                setClipIndex(index)

                // Parse clip data
                const clipDataRaw = data.clips[index]
                let videoPath = clipDataRaw
                let originalUrl = clipDataRaw // Track the ORIGINAL clean video
                let subtitledPath = undefined
                let paddingStart = 0
                let extraData: any = {}

                try {
                    const parsed = JSON.parse(clipDataRaw)
                    if (parsed.url) {
                        // Use originalUrl if available, otherwise use url
                        originalUrl = parsed.originalUrl || parsed.url
                        // For preview, use subtitled version if available
                        videoPath = parsed.subtitledPath || parsed.url
                        subtitledPath = parsed.subtitledPath
                        paddingStart = parsed.paddingStart || 0
                        extraData = parsed
                    }
                } catch (e) {
                    // Not JSON, assume string URL
                    originalUrl = clipDataRaw
                }

                // Construct clip object for editor
                setClip({
                    id: clipId,
                    videoPath: videoPath, // For preview - may be subtitled
                    originalUrl: originalUrl, // ALWAYS the clean original video
                    subtitledPath: subtitledPath,
                    start: 0,
                    end: 0,
                    duration: 0,
                    hasSubtitles: extraData.hasSubtitles || false,
                    isProcessing: false,
                    paddingStart,
                    subtitleSegments: extraData.subtitleSegments || [],
                    subtitleStyle: extraData.subtitleStyle
                } as any)

            } else {
                toast.error('Proje verisi bulunamadı')
                router.push(`/editor/${videoId}`)
            }
        } catch (e) {
            console.error(e)
            toast.error('Veri yüklenirken hata')
        } finally {
            setIsLoading(false)
        }
    }, [videoId, clipId, router])

    const handleSave = async (segments: SubtitleSegment[], style: SubtitleStyle) => {
        try {
            if (!clip) return

            // Get the ORIGINAL clean video URL (without subtitles)
            // This is critical - we must never burn subtitles onto an already-subtitled video
            const originalVideoUrl = (clip as any).originalUrl || clip.videoPath

            // 1. Call subtitle burn API with ORIGINAL video
            toast.loading('Altyazılar videoya yazılıyor...', { id: 'subtitle-burn' })

            const videoPathForApi = originalVideoUrl.startsWith('http')
                ? originalVideoUrl
                : originalVideoUrl.replace(/^\//, '') // Remove leading slash for local paths

            console.log('Burning subtitles onto ORIGINAL video:', videoPathForApi)

            const response = await fetch('/api/subtitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: videoPathForApi,
                    segments,
                    style: style.id,
                    font: style.font,
                    primaryColor: style.primaryColor
                })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Altyazı yazma hatası')
            }

            const result = await response.json()
            toast.dismiss('subtitle-burn')

            // 2. Update localStorage with new subtitled video path
            const stored = localStorage.getItem(`kadostudio_editor_${videoId}`)
            if (stored && clipIndex !== -1) {
                const data: EditorData = JSON.parse(stored)

                // Get existing clip data
                const existingRaw = data.clips[clipIndex]
                let clipObj: any = {}
                try {
                    clipObj = JSON.parse(existingRaw)
                } catch {
                    clipObj = { url: existingRaw }
                }

                // IMPORTANT: Preserve the original URL for future re-burns
                // If this is the first time, originalUrl = current url
                if (!clipObj.originalUrl) {
                    clipObj.originalUrl = clipObj.url || existingRaw
                }

                // Update with subtitle data
                clipObj.hasSubtitles = true
                clipObj.subtitleSegments = segments
                clipObj.subtitleStyle = style
                clipObj.subtitledPath = result.outputPath // New video with burned subtitles
                // DON'T overwrite url with subtitledPath - keep originalUrl intact
                // clipObj.url stays as the original or we explicitly don't change it

                // Save back
                data.clips[clipIndex] = JSON.stringify(clipObj)
                localStorage.setItem(`kadostudio_editor_${videoId}`, JSON.stringify(data))

                toast.success('Altyazılar başarıyla yazıldı!')

                // Navigate back
                router.push(`/editor/${videoId}`)
            }
        } catch (e: any) {
            console.error(e)
            toast.dismiss('subtitle-burn')
            toast.error(e.message || 'Kaydetme başarısız')
        }
    }

    const handleBack = () => {
        router.push(`/editor/${videoId}`)
    }

    if (isLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-neon-green font-mono">Loading Studio...</div>
    }

    if (!clip) return null

    return (
        <SubtitlePage
            videoPath={clip.videoPath}
            initialSegments={clip.subtitleSegments}
            onSave={handleSave}
            onBack={handleBack}
        />
    )
}

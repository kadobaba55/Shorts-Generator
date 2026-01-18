'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { EditorProvider, useEditor, EditorClip } from '@/components/studio/EditorContext'
import StudioLayout from '@/components/studio/StudioLayout'

// --- Internal Bootstrapper Component ---
// Has access to Context, handles loading data
function EditorInitializer() {
    const { setClips, setSelectedClipId } = useEditor()
    const params = useParams()
    const router = useRouter()
    const videoId = params.videoId as string

    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadProject = async () => {
            try {
                const stored = localStorage.getItem(`kadostudio_editor_${videoId}`)
                if (!stored) {
                    toast.error('Proje bulunamadı')
                    router.push('/')
                    return
                }

                const data = JSON.parse(stored)

                // Transform existing data to new EditorClip format
                const loadedClips: EditorClip[] = data.clips.map((clipDataRaw: any, index: number) => {
                    // Similar parsing logic as before, but cleaner
                    let parsed: any = {}

                    try {
                        parsed = typeof clipDataRaw === 'string' ? JSON.parse(clipDataRaw) : clipDataRaw
                    } catch {
                        parsed = { url: clipDataRaw }
                    }

                    const originalInfo = data.originalClips[index] || {}

                    // Determine paths
                    // If parsed.url is valid JSON object, it might have nested structure? 
                    // The previous logic handled "string URL" vs "JSON string".

                    const videoUrl = parsed.url || (typeof clipDataRaw === 'string' ? clipDataRaw : '')
                    const originalUrl = parsed.originalUrl || videoUrl
                    const subtitledPath = parsed.subtitledPath

                    // Determine timing
                    // Global start time needs to be calculated if we want a sequence.
                    // For now, let's just use the clip's duration. 
                    // If we want a timeline 0..N, we need to accumulate duration.
                    // But we don't have that easily here unless we reduce. 
                    // Let's modify this later for sequential. 
                    // For now, let's assign "start" = 0 for all (stacking on top) or sequential?
                    // Let's try sequential.

                    const duration = (originalInfo.end || 30) - (originalInfo.start || 0)

                    return {
                        id: `clip_${index + 1}`,
                        videoPath: subtitledPath || videoUrl,
                        originalUrl: originalUrl,
                        subtitledPath: subtitledPath,
                        start: 0, // We will recalculate this after mapping
                        duration: duration,
                        trimStart: parsed.paddingStart || 0,
                        trimEnd: parsed.paddingStart + duration, // Approx
                        hasSubtitles: parsed.hasSubtitles || false,
                        subtitleSegments: parsed.subtitleSegments || [],
                        subtitleStyle: parsed.subtitleStyle,
                        volume: 1,
                        opacity: 1,
                        scale: 1,
                        position: { x: 0, y: 0 }
                    }
                })

                // Recalculate start times for sequential timeline
                let runningTime = 0
                const positionedClips = loadedClips.map(clip => {
                    const c = { ...clip, start: runningTime }
                    runningTime += clip.duration
                    return c
                })

                setClips(positionedClips)

                // Select first clip by default
                if (positionedClips.length > 0) {
                    setSelectedClipId(positionedClips[0].id)
                }

            } catch (e) {
                console.error('Failed to load project:', e)
                toast.error('Proje yüklenemedi')
            } finally {
                setIsLoading(false)
            }
        }

        loadProject()
    }, [videoId, router, setClips, setSelectedClipId])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-bg-terminal text-neon-green font-mono">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                    <div className="animate-pulse">&gt; LOADING STUDIO ENV...</div>
                </div>
            </div>
        )
    }

    return <StudioLayout />
}

// --- Main Page Wrapper ---
export default function EditorPage() {
    return (
        <EditorProvider>
            <EditorInitializer />
        </EditorProvider>
    )
}

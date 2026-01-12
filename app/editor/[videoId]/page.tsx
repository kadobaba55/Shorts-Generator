'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import VideoEditor from '@/components/VideoEditor'

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
                const clips: ProcessedClip[] = data.clips.map((clipPath, index) => ({
                    id: `clip_${index + 1}`,
                    videoPath: clipPath,
                    start: data.originalClips[index]?.start || 0,
                    end: data.originalClips[index]?.end || 30,
                    duration: (data.originalClips[index]?.end || 30) - (data.originalClips[index]?.start || 0),
                    hasSubtitles: false,
                    isProcessing: false
                }))
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
                            <div className="font-mono text-xs text-neon-green">
                                {session.user?.tokens} CREDITS
                            </div>
                        )}
                        <Link href="/" className="font-mono text-xs text-neon-cyan hover:text-white">
                            [+ NEW VIDEO]
                        </Link>
                    </div>
                </div>
            </header>

            {/* Guest Banner */}
            {!session && (
                <div className="bg-gradient-to-r from-neon-amber/20 to-neon-purple/20 border-b border-neon-amber/30">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🎬</span>
                            <div className="font-mono text-xs">
                                <span className="text-neon-amber">Misafir Modu</span>
                                <span className="text-gray-400 ml-2">| </span>
                                <span className="text-neon-red">İndirmelerde filigran eklenir</span>
                            </div>
                        </div>
                        <Link href="/register" className="btn-primary text-xs px-4 py-1.5 animate-pulse">
                            Kayıt Ol - Filigransız İndir
                        </Link>
                    </div>
                </div>
            )}

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

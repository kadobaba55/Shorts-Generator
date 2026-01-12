'use client'

import { useState, useRef, useEffect } from 'react'
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
}

import SubtitleEditor from './SubtitleEditor'

interface VideoEditorProps {
    processedClips: ProcessedClip[]
    setProcessedClips: (clips: ProcessedClip[]) => void
    isGeneratingClips: boolean
    isAnalyzing?: boolean
    processProgress: number
    onBack: () => void
    onAddSubtitles: (clipIndex: number) => Promise<void>
    onAddSubtitlesToAll: () => Promise<void>
    estimatedTimeRemaining?: string
}

export default function VideoEditor({
    processedClips,
    setProcessedClips,
    isGeneratingClips,
    isAnalyzing = false,
    processProgress,
    onBack,
    onAddSubtitles, // This prop will be used inside the custom handler now
    onAddSubtitlesToAll,
    estimatedTimeRemaining
}: VideoEditorProps) {
    const [selectedClipIndex, setSelectedClipIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    // Subtitle Editor State
    const [isSubtitleEditorOpen, setIsSubtitleEditorOpen] = useState(false)
    const [editingClipIndex, setEditingClipIndex] = useState<number | null>(null)

    const [zoom, setZoom] = useState(1)
    const [showClipList, setShowClipList] = useState(false)
    const [showProperties, setShowProperties] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const timelineRef = useRef<HTMLDivElement>(null)

    const handleOpenSubtitleEditor = (index: number) => {
        setEditingClipIndex(index)
        setIsSubtitleEditorOpen(true)
    }

    const handleSaveSubtitles = async (segments: any[], style?: any) => {
        if (editingClipIndex === null) return

        const clip = processedClips[editingClipIndex]

        // Optimistic update
        const updatedClips = [...processedClips]
        updatedClips[editingClipIndex].isProcessing = true
        setProcessedClips(updatedClips)

        try {
            // Use new subtitle endpoint that burns segments with custom style
            const res = await fetch('/api/subtitle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoPath: clip.videoPath,
                    segments: segments,
                    style: style?.id || 'viral',
                    font: style?.font || 'Impact',
                    primaryColor: style?.primaryColor || '#00FFFF',
                    addEmojis: true,
                    highlightKeywords: true
                })
            })

            if (!res.ok) throw new Error('Subtitle failed')

            const data = await res.json()

            const finalClips = [...processedClips]
            finalClips[editingClipIndex] = {
                ...finalClips[editingClipIndex],
                videoPath: data.outputPath,
                isProcessing: false,
                hasSubtitles: true
            }
            setProcessedClips(finalClips)
            setIsSubtitleEditorOpen(false)

        } catch (error) {
            console.error(error)
            const revertedClips = [...processedClips]
            revertedClips[editingClipIndex].isProcessing = false
            setProcessedClips(revertedClips)
            alert('Altyazı eklenirken hata oluştu')
        }
    }

    const selectedClip = processedClips[selectedClipIndex]

    // Update current time from video
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime)
        }

        video.addEventListener('timeupdate', handleTimeUpdate)
        return () => video.removeEventListener('timeupdate', handleTimeUpdate)
    }, [selectedClip])

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }

    // Toggle play/pause
    const togglePlay = () => {
        const video = videoRef.current
        if (!video) return

        if (isPlaying) {
            video.pause()
        } else {
            video.play()
        }
        setIsPlaying(!isPlaying)
    }

    // Seek to position
    const seekTo = (time: number) => {
        const video = videoRef.current
        if (video) {
            video.currentTime = time
            setCurrentTime(time)
        }
    }

    // Handle timeline click
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !selectedClip) return

        const rect = timelineRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = x / rect.width
        const newTime = percentage * selectedClip.duration
        seekTo(Math.max(0, Math.min(newTime, selectedClip.duration)))
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return

            switch (e.key) {
                case ' ':
                    e.preventDefault()
                    togglePlay()
                    break
                case 'ArrowLeft':
                    e.preventDefault()
                    seekTo(Math.max(0, currentTime - 1))
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    seekTo(Math.min(selectedClip?.duration || 0, currentTime + 1))
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentTime, selectedClip, isPlaying])

    // Download single clip
    const downloadClip = (clip: ProcessedClip, index: number) => {
        const downloadPath = clip.subtitledPath || clip.videoPath
        const link = document.createElement('a')
        link.href = downloadPath
        link.download = `clip-${index + 1}.mp4`
        link.click()
        toast.success(`Clip ${index + 1} indiriliyor!`)
    }

    // Copy video URL to clipboard
    const copyVideoUrl = (clip: ProcessedClip) => {
        const videoUrl = `${window.location.origin}${clip.subtitledPath || clip.videoPath}`
        navigator.clipboard.writeText(videoUrl).then(() => {
            toast.success('🔗 Video linki kopyalandı!')
        }).catch(() => {
            toast.error('Kopyalama başarısız')
        })
    }

    return (
        <div className="py-4 md:py-8 animate-slide-up">
            {/* Editor Terminal Window */}
            <div className="border-2 border-neon-green bg-bg-terminal">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 border-neon-green/30 bg-bg-card">
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-red"></span>
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-amber"></span>
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-green"></span>
                    <span className="font-mono text-xs md:text-sm text-neon-green ml-2 hidden sm:inline">
                        terminal://video-editor
                    </span>
                    <div className="ml-auto flex items-center gap-2 md:gap-4">
                        <button
                            onClick={onBack}
                            className="font-mono text-[10px] md:text-xs text-neon-amber hover:text-neon-green transition-colors"
                        >
                            [← BACK]
                        </button>
                        <button
                            onClick={() => {
                                processedClips.forEach((clip, i) => downloadClip(clip, i))
                            }}
                            className="font-mono text-[10px] md:text-xs text-neon-cyan hover:text-neon-green transition-colors"
                        >
                            [EXPORT]
                        </button>
                    </div>
                </div>

                {/* Analysis Status */}
                {isAnalyzing && (
                    <div className="p-3 md:p-4 border-b border-neon-cyan/30 bg-neon-cyan/5">
                        <div className="flex items-center gap-3">
                            <div className="loading-ascii text-neon-cyan"></div>
                            <span className="font-mono text-xs md:text-sm text-neon-cyan">
                                &gt; AI analyzing video...
                            </span>
                        </div>
                    </div>
                )}

                {/* Processing Status */}
                {isGeneratingClips && (
                    <div className="p-3 md:p-4 border-b border-neon-magenta/30 bg-neon-magenta/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs md:text-sm text-neon-magenta">
                                &gt; Rendering...
                            </span>
                            <span className="font-mono text-xs md:text-sm text-neon-green">
                                [{processProgress}%]
                            </span>
                        </div>
                        <div className="progress-retro">
                            <div
                                className="progress-retro-fill"
                                style={{ width: `${processProgress}%` }}
                            />
                        </div>
                        {estimatedTimeRemaining && (
                            <div className="flex items-center justify-center font-mono text-xs text-neon-green mt-2 animate-pulse">
                                <span className="mr-2">⏱</span>
                                <span>Tahmini: {estimatedTimeRemaining} kaldı</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Mobile Controls Bar */}
                {processedClips.length > 0 && !isGeneratingClips && (
                    <div className="flex lg:hidden items-center gap-2 p-2 border-b border-neon-green/30 bg-bg-card">
                        <button
                            onClick={() => setShowClipList(!showClipList)}
                            className={`flex-1 py-2 font-mono text-xs border transition-all ${showClipList
                                ? 'border-neon-green bg-neon-green/10 text-neon-green'
                                : 'border-gray-600 text-gray-400'
                                }`}
                        >
                            CLIPS [{processedClips.length}]
                        </button>
                        <button
                            onClick={() => setShowProperties(!showProperties)}
                            className={`flex-1 py-2 font-mono text-xs border transition-all ${showProperties
                                ? 'border-neon-amber bg-neon-amber/10 text-neon-amber'
                                : 'border-gray-600 text-gray-400'
                                }`}
                        >
                            PROPS
                        </button>
                    </div>
                )}

                {/* Main Editor Layout */}
                {processedClips.length > 0 && !isGeneratingClips && (
                    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-0">
                        {/* Left: Clip List - Collapsible on mobile */}
                        <div className={`${showClipList ? 'block' : 'hidden'} lg:block lg:border-r border-neon-green/30 bg-bg-card p-3 md:p-4 space-y-2 md:space-y-3`}>
                            <div className="font-mono text-xs text-neon-amber mb-2 hidden lg:block">
                                &gt; CLIPS [{processedClips.length}]
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                                {processedClips.map((clip, index) => (
                                    <button
                                        key={clip.id}
                                        onClick={() => {
                                            setSelectedClipIndex(index)
                                            setShowClipList(false)
                                        }}
                                        className={`p-2 md:p-3 text-left transition-all font-mono text-xs
                                            ${selectedClipIndex === index
                                                ? 'border-2 border-neon-green bg-neon-green/10 text-neon-green'
                                                : 'border border-gray-700 hover:border-neon-green/50 text-gray-400'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span>CLIP_{String(index + 1).padStart(2, '0')}</span>
                                            {clip.hasSubtitles && (
                                                <span className="text-neon-cyan text-[10px]">◉</span>
                                            )}
                                        </div>
                                        <div className="text-gray-600 text-[10px]">
                                            {formatTime(clip.start)} → {formatTime(clip.end)}
                                        </div>
                                    </button>
                                ))}
                            </div>


                        </div>

                        {/* Center: Video Preview */}
                        <div className="lg:col-span-2 p-3 md:p-4 space-y-3 md:space-y-4">
                            {/* Video Player */}
                            <div className="border-2 border-neon-green bg-black aspect-[9/16] max-h-[50vh] md:max-h-[60vh] mx-auto relative overflow-hidden">
                                <video
                                    ref={videoRef}
                                    key={selectedClip?.subtitledPath || selectedClip?.videoPath}
                                    src={selectedClip?.subtitledPath || selectedClip?.videoPath}
                                    className="w-full h-full object-contain"
                                    playsInline
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={() => setIsPlaying(false)}
                                />

                                {/* Play Button Overlay */}
                                {!isPlaying && (
                                    <button
                                        onClick={togglePlay}
                                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors"
                                    >
                                        <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-neon-green flex items-center justify-center text-neon-green font-mono text-xl md:text-2xl hover:bg-neon-green hover:text-black transition-all">
                                            ▶
                                        </div>
                                    </button>
                                )}

                                {/* Clip Indicator */}
                                <div className="absolute top-2 left-2 font-mono text-xs text-neon-green bg-black/70 px-2 py-1">
                                    CLIP_{String(selectedClipIndex + 1).padStart(2, '0')}
                                </div>
                            </div>

                            {/* Video Controls */}
                            <div className="space-y-2 md:space-y-3">
                                {/* Time Display & Controls */}
                                <div className="flex items-center justify-between font-mono text-xs md:text-sm">
                                    <span className="text-neon-green">
                                        {formatTime(currentTime)}
                                    </span>
                                    <div className="flex items-center gap-2 md:gap-4">
                                        <button
                                            onClick={() => seekTo(0)}
                                            className="text-gray-500 hover:text-neon-green transition-colors p-1"
                                        >
                                            [|◀]
                                        </button>
                                        <button
                                            onClick={togglePlay}
                                            className="text-neon-green hover:text-neon-amber transition-colors text-base md:text-lg px-2"
                                        >
                                            {isPlaying ? '[||]' : '[▶]'}
                                        </button>
                                        <button
                                            onClick={() => seekTo(selectedClip?.duration || 0)}
                                            className="text-gray-500 hover:text-neon-green transition-colors p-1"
                                        >
                                            [▶|]
                                        </button>
                                    </div>
                                    <span className="text-gray-500">
                                        {formatTime(selectedClip?.duration || 0)}
                                    </span>
                                </div>

                                {/* Timeline */}
                                <div
                                    ref={timelineRef}
                                    onClick={handleTimelineClick}
                                    className="relative h-10 md:h-12 border-2 border-neon-green bg-bg-card cursor-pointer touch-none"
                                >
                                    {/* Progress Fill */}
                                    <div
                                        className="absolute top-0 left-0 h-full bg-neon-green/20"
                                        style={{
                                            width: `${(currentTime / (selectedClip?.duration || 1)) * 100}%`
                                        }}
                                    />

                                    {/* Playhead */}
                                    <div
                                        className="absolute top-0 w-0.5 h-full bg-neon-green shadow-[0_0_10px_#00ff41]"
                                        style={{
                                            left: `${(currentTime / (selectedClip?.duration || 1)) * 100}%`
                                        }}
                                    >
                                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-neon-green" />
                                    </div>

                                    {/* Time Markers - Less on mobile */}
                                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 md:px-2 font-mono text-[8px] text-gray-600">
                                        <span>00:00</span>
                                        <span className="hidden sm:inline">{formatTime((selectedClip?.duration || 0) / 2)}</span>
                                        <span>{formatTime(selectedClip?.duration || 0)}</span>
                                    </div>
                                </div>

                                {/* Quick Actions for Mobile */}
                                <div className="flex gap-2 lg:hidden">
                                    {selectedClip && !selectedClip.hasSubtitles && (
                                        <button
                                            onClick={() => handleOpenSubtitleEditor(selectedClipIndex)}
                                            disabled={selectedClip.isProcessing}
                                            className="flex-1 btn-primary py-2 text-xs disabled:opacity-50"
                                        >
                                            {selectedClip.isProcessing ? 'PROCESSING...' : '[+ SUBTITLE]'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => selectedClip && downloadClip(selectedClip, selectedClipIndex)}
                                        className="flex-1 btn-secondary py-2 text-xs"
                                    >
                                        [DOWNLOAD]
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Properties Panel - Collapsible on mobile */}
                        <div className={`${showProperties ? 'block' : 'hidden'} lg:block lg:border-l border-neon-green/30 bg-bg-card p-3 md:p-4 space-y-3 md:space-y-4`}>
                            <div className="font-mono text-xs text-neon-amber mb-2 hidden lg:block">
                                &gt; PROPERTIES
                            </div>

                            {selectedClip && (
                                <>
                                    {/* Clip Info */}
                                    <div className="space-y-2 pb-3 md:pb-4 border-b border-gray-700">
                                        <div className="flex justify-between font-mono text-xs">
                                            <span className="text-gray-500">NAME:</span>
                                            <span className="text-neon-green">CLIP_{String(selectedClipIndex + 1).padStart(2, '0')}</span>
                                        </div>
                                        <div className="flex justify-between font-mono text-xs">
                                            <span className="text-gray-500">DURATION:</span>
                                            <span className="text-neon-green">{selectedClip.duration.toFixed(1)}s</span>
                                        </div>
                                        <div className="flex justify-between font-mono text-xs">
                                            <span className="text-gray-500">RANGE:</span>
                                            <span className="text-neon-cyan">{formatTime(selectedClip.start)} - {formatTime(selectedClip.end)}</span>
                                        </div>
                                    </div>

                                    {/* Subtitle Status */}
                                    <div className="space-y-2 md:space-y-3 pb-3 md:pb-4 border-b border-gray-700">
                                        <div className="font-mono text-xs text-neon-amber">
                                            &gt; SUBTITLE
                                        </div>
                                        {selectedClip.hasSubtitles ? (
                                            <div className="flex items-center gap-2 font-mono text-xs text-neon-green">
                                                <span className="w-2 h-2 bg-neon-green"></span>
                                                ENABLED
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenSubtitleEditor(selectedClipIndex)}
                                                disabled={selectedClip.isProcessing}
                                                className="w-full btn-primary py-2 text-xs disabled:opacity-50"
                                            >
                                                {selectedClip.isProcessing ? 'PROCESSING...' : '[+ ADD SUBTITLE]'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Effects */}
                                    <div className="space-y-2 md:space-y-3 pb-3 md:pb-4 border-b border-gray-700">
                                        <div className="font-mono text-xs text-neon-amber">
                                            &gt; EFFECTS
                                        </div>
                                        <div className="space-y-1 md:space-y-2">
                                            <div className="flex items-center justify-between font-mono text-xs">
                                                <span className="text-gray-400">FADE_IN:</span>
                                                <span className="text-neon-green">0.5s</span>
                                            </div>
                                            <div className="flex items-center justify-between font-mono text-xs">
                                                <span className="text-gray-400">FADE_OUT:</span>
                                                <span className="text-neon-green">0.5s</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-2 hidden lg:block">
                                        <button
                                            onClick={() => downloadClip(selectedClip, selectedClipIndex)}
                                            className="w-full btn-secondary py-2 text-xs"
                                        >
                                            [DOWNLOAD]
                                        </button>
                                        <button
                                            onClick={() => copyVideoUrl(selectedClip)}
                                            className="w-full py-2 text-xs border border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 transition-colors font-mono"
                                        >
                                            [📋 COPY LINK]
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {processedClips.length === 0 && !isGeneratingClips && !isAnalyzing && (
                    <div className="p-8 md:p-12 text-center">
                        <div className="font-pixel text-3xl md:text-4xl text-neon-green/30 mb-4">
                            🎬
                        </div>
                        <div className="font-mono text-xs md:text-sm text-gray-500">
                            &gt; NO_CLIPS_FOUND
                        </div>
                        <div className="font-mono text-xs text-gray-600 mt-2">
                            // Go back to config and process video
                        </div>
                    </div>
                )}

                {/* Keyboard Shortcuts Help - Hidden on mobile */}
                <div className="hidden md:block px-4 py-2 border-t border-neon-green/30 bg-bg-card/50">
                    <div className="font-mono text-[10px] text-gray-600 flex items-center gap-6 justify-center">
                        <span>[SPACE] Play/Pause</span>
                        <span>[←/→] Seek 1s</span>
                    </div>
                </div>

                {/* Subtitle Editor Modal */}
                {isSubtitleEditorOpen && editingClipIndex !== null && (
                    <SubtitleEditor
                        isOpen={isSubtitleEditorOpen}
                        onClose={() => setIsSubtitleEditorOpen(false)}
                        videoPath={processedClips[editingClipIndex].videoPath}
                        onSave={handleSaveSubtitles}
                    />
                )}
            </div>
        </div >
    )
}

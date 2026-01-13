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
    paddingStart?: number
    trimStart?: number
    trimEnd?: number
    fadeIn?: number
    fadeOut?: number
    volume?: number
    speed?: number
}

// SubtitleEditor import removed
import { useRouter, usePathname } from 'next/navigation'

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
    onAddSubtitlesToAll,
    estimatedTimeRemaining
}: VideoEditorProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [selectedClipIndex, setSelectedClipIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    // Subtitle Editor State
    // REMOVED: const [isSubtitleEditorOpen, setIsSubtitleEditorOpen] = useState(false)
    const [editingClipIndex, setEditingClipIndex] = useState<number | null>(null)
    const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16')
    const [objectFit, setObjectFit] = useState<'contain' | 'cover'>('contain')
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })

    const [zoom, setZoom] = useState(1)
    const [showClipList, setShowClipList] = useState(false)
    const [showProperties, setShowProperties] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const timelineRef = useRef<HTMLDivElement>(null)

    const handleOpenSubtitleEditor = (index: number) => {
        // Navigate to dedicated subtitle page
        // pathname is like /editor/[videoId]
        // we want /editor/[videoId]/subtitle/clip_[index+1]
        const clipId = `clip_${index + 1}`
        router.push(`${pathname}/subtitle/${clipId}`)
    }

    // Removed handleSaveSubtitles as it's now handled in the dedicated page
    // Refetch data on focus to update UI if coming back from subtitle editor

    // We rely on parent calling setProcessedClips, but parent needs to re-read localStorage.
    // VideoEditor doesn't read localStorage, the parent page does.
    // We can trigger a reload via a callback or simpler: trigger a router refresh?
    // Parent page should listen to focus/storage events.


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
        if (!timelineRef.current || !selectedClip || !videoRef.current) return

        const rect = timelineRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const percentage = x / rect.width

        // Timeline represents the video FILE duration
        // We need to know the actual file duration. 
        // selectedClip.duration is confusing now (it was logic duration).
        // Let's use videoRef.current.duration if available, otherwise guess.
        const fileDuration = videoRef.current.duration || (selectedClip.trimEnd || 30) + 15

        const newTime = percentage * fileDuration
        seekTo(Math.max(0, Math.min(newTime, fileDuration)))
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

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
                            onClick={async () => {
                                if (!selectedClip) return
                                toast.loading('Rendering clip...', { id: 'render' })
                                try {
                                    const res = await fetch('/api/export', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            videoPath: selectedClip.videoPath,
                                            trimStart: selectedClip.trimStart || 0,
                                            trimEnd: selectedClip.trimEnd || selectedClip.duration,
                                            aspectRatio,
                                            transform
                                        })
                                    })

                                    if (!res.ok) throw new Error('Render failed')
                                    const data = await res.json()

                                    // Download
                                    const link = document.createElement('a')
                                    link.href = data.url
                                    link.download = `rendered_clip_${selectedClipIndex + 1}.mp4`
                                    link.click()
                                    toast.success('Render complete!', { id: 'render' })
                                } catch (e) {
                                    console.error(e)
                                    toast.error('Render failed', { id: 'render' })
                                }
                            }}
                            className="font-mono text-[10px] md:text-xs text-neon-cyan hover:text-neon-green transition-colors border border-neon-cyan px-3 py-1 rounded hover:bg-neon-cyan/10"
                        >
                            [RENDER & EXPORT]
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
                                        className={`group relative p-2 md:p-3 text-left transition-all font-mono text-xs w-full overflow-hidden
                                            ${selectedClipIndex === index
                                                ? 'border-2 border-neon-green bg-neon-green/10 text-neon-green scale-[1.02] shadow-[0_0_15px_rgba(74,222,128,0.2)]'
                                                : 'border border-gray-700 hover:border-neon-green/50 text-gray-400 hover:bg-gray-800'
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            {/* Thumbnail Preview - 16:9 for landscape source */}
                                            <div className="relative w-20 h-12 bg-black border border-gray-800 shrink-0 overflow-hidden">
                                                <video
                                                    src={`${clip.videoPath}#t=1`}
                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                    muted
                                                    playsInline
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                            </div>

                                            <div className="flex flex-col justify-between py-1 w-full">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold group-hover:text-neon-cyan transition-colors">CLIP_{String(index + 1).padStart(2, '0')}</span>
                                                    {clip.hasSubtitles && (
                                                        <span className="text-neon-cyan text-[10px] animate-pulse">◉ SUB</span>
                                                    )}
                                                </div>

                                                <div className="flex gap-2">
                                                    <div className="bg-gray-900/80 px-1.5 rounded text-[10px] text-gray-500 border border-gray-800">
                                                        {formatTime(clip.duration)}
                                                    </div>
                                                </div>

                                                <div className="text-gray-600 text-[10px] flex items-center gap-1">
                                                    <span>{formatTime(clip.start)}</span>
                                                    <span className="text-gray-700">→</span>
                                                    <span>{formatTime(clip.end)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>


                        </div>

                        {/* Center: Video Preview */}
                        <div className="lg:col-span-2 p-3 md:p-4 space-y-3 md:space-y-4">
                            {/* Video Player */}
                            <div className={`
                                border-2 border-neon-green bg-black mx-auto relative overflow-hidden transition-all duration-300
                                ${aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[60vh]' : ''}
                                ${aspectRatio === '16:9' ? 'aspect-[16/9] w-full' : ''}
                                ${aspectRatio === '1:1' ? 'aspect-square max-h-[60vh]' : ''}
                            `}>
                                <video
                                    ref={videoRef}
                                    key={selectedClip?.subtitledPath || selectedClip?.videoPath}
                                    src={selectedClip?.subtitledPath || selectedClip?.videoPath}
                                    className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                                    style={{
                                        transform: `scale(${transform.scale}) translate(${transform.x}px, ${transform.y}px)`
                                    }}
                                    playsInline
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    onEnded={() => setIsPlaying(false)}
                                    onTimeUpdate={(e) => {
                                        // Loop within trim range if specific logic needed, or just let it play
                                        // For now let's just update time
                                        const video = e.currentTarget
                                        setCurrentTime(video.currentTime)

                                        // Optional: Loop logic
                                        // if (selectedClip.trimEnd && video.currentTime > selectedClip.trimEnd) {
                                        //    video.currentTime = selectedClip.trimStart || 0
                                        // }
                                    }}
                                />

                                {/* Fit/Fill Toggle - Now acts as Auto-Zoom */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        // Auto-calculate zoom to fill height
                                        // Assuming input is 9:16 (1080x1920) inside a frame
                                        // If we want to fill 16:9 frame with 9:16 content:
                                        // We need to match WIDTH. 
                                        // 9:16 content width is small compared to 16:9 container.
                                        // Scale = (16/9) / (9/16) = 3.16x !

                                        if (transform.scale > 1.1) {
                                            setTransform({ scale: 1, x: 0, y: 0 }) // Reset
                                        } else {
                                            // Smart Zoom based on Aspect Ratio
                                            let newScale = 1.5
                                            if (aspectRatio === '16:9') newScale = 3.16 // Massive zoom to cover
                                            if (aspectRatio === '1:1') newScale = 1.77 // Zoom to cover square

                                            setTransform({ scale: newScale, x: 0, y: 0 })
                                        }
                                    }}
                                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-neon-cyan border border-neon-cyan/50 rounded px-2 py-1 text-[10px] font-mono backdrop-blur-sm z-10"
                                >
                                    [{transform.scale > 1.1 ? 'RESET' : 'AUTO-FILL'}]
                                </button>

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
                                        className="absolute top-0 left-0 h-full bg-neon-green/20 pointer-events-none"
                                        style={{
                                            left: `${((selectedClip.trimStart || 0) / (videoRef.current?.duration || 1)) * 100}%`,
                                            width: `${(((selectedClip.trimEnd || selectedClip.duration) - (selectedClip.trimStart || 0)) / (videoRef.current?.duration || 1)) * 100}%`
                                        }}
                                    />

                                    {/* Playhead */}
                                    <div
                                        className="absolute top-0 w-0.5 h-full bg-neon-green shadow-[0_0_10px_#00ff41] z-10"
                                        style={{
                                            left: `${(currentTime / (videoRef.current?.duration || 1)) * 100}%`
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
                                            <span className="text-neon-green">{((selectedClip.trimEnd || selectedClip.duration) - (selectedClip.trimStart || 0)).toFixed(1)}s</span>
                                        </div>
                                        <div className="flex justify-between font-mono text-xs">
                                            <span className="text-gray-500">RANGE:</span>
                                            <span className="text-neon-cyan">{(selectedClip.trimStart || 0).toFixed(1)}s - {(selectedClip.trimEnd || selectedClip.duration).toFixed(1)}s</span>
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

                                    {/* Duration & Range Controls */}
                                    <div className="space-y-4 pb-4 border-b border-gray-700">
                                        <div className="font-mono text-xs text-neon-amber">&gt; TIMING</div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-gray-400">
                                                    <span>START: {formatTime(selectedClip.start)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const newClips = [...processedClips]
                                                            newClips[selectedClipIndex].start = Math.max(0, selectedClip.start - 0.5)
                                                            newClips[selectedClipIndex].duration = newClips[selectedClipIndex].end - newClips[selectedClipIndex].start
                                                            setProcessedClips(newClips)
                                                        }}
                                                        className="px-2 py-1 bg-gray-800 hover:bg-neon-green/20 rounded text-xs text-neon-green"
                                                    >
                                                        -0.5s
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newClips = [...processedClips]
                                                            newClips[selectedClipIndex].start = Math.min(selectedClip.end - 1, selectedClip.start + 0.5)
                                                            newClips[selectedClipIndex].duration = newClips[selectedClipIndex].end - newClips[selectedClipIndex].start
                                                            setProcessedClips(newClips)
                                                        }}
                                                        className="px-2 py-1 bg-gray-800 hover:bg-neon-green/20 rounded text-xs text-neon-green"
                                                    >
                                                        +0.5s
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-gray-400">
                                                    <span>END: {formatTime(selectedClip.end)}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const newClips = [...processedClips]
                                                            newClips[selectedClipIndex].end = Math.max(selectedClip.start + 1, selectedClip.end - 0.5)
                                                            newClips[selectedClipIndex].duration = newClips[selectedClipIndex].end - newClips[selectedClipIndex].start
                                                            setProcessedClips(newClips)
                                                        }}
                                                        className="px-2 py-1 bg-gray-800 hover:bg-neon-green/20 rounded text-xs text-neon-green"
                                                    >
                                                        -0.5s
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newClips = [...processedClips]
                                                            newClips[selectedClipIndex].end = selectedClip.end + 0.5
                                                            newClips[selectedClipIndex].duration = newClips[selectedClipIndex].end - newClips[selectedClipIndex].start
                                                            setProcessedClips(newClips)
                                                        }}
                                                        className="px-2 py-1 bg-gray-800 hover:bg-neon-green/20 rounded text-xs text-neon-green"
                                                    >
                                                        +0.5s
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Aspect Ratio */}
                                    <div className="space-y-2 pb-4 border-b border-gray-700">
                                        <div className="font-mono text-xs text-neon-amber">&gt; ASPECT_RATIO</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['9:16', '16:9', '1:1'].map((ratio) => (
                                                <button
                                                    key={ratio}
                                                    onClick={() => setAspectRatio(ratio as any)}
                                                    className={`px-2 py-1 text-xs font-mono border rounded transition-all ${aspectRatio === ratio
                                                        ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10'
                                                        : 'border-gray-700 text-gray-500 hover:border-gray-500'
                                                        }`}
                                                >
                                                    {ratio}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="text-[10px] text-gray-500 italic">
                                            * Preview only. Export uses original.
                                        </div>
                                    </div>

                                    <div className="space-y-3 pb-4 border-b border-gray-700">
                                        <div className="font-mono text-xs text-neon-amber">
                                            &gt; EFFECTS
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <div className="flex justify-between font-mono text-xs">
                                                    <span className="text-gray-400">FADE_IN:</span>
                                                    <span className="text-neon-green">{(selectedClip.fadeIn || 0).toFixed(1)}s</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="5"
                                                    step="0.1"
                                                    value={selectedClip.fadeIn || 0}
                                                    onChange={(e) => {
                                                        const newClips = [...processedClips]
                                                        newClips[selectedClipIndex].fadeIn = parseFloat(e.target.value)
                                                        setProcessedClips(newClips)
                                                    }}
                                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:rounded-full"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between font-mono text-xs">
                                                    <span className="text-gray-400">FADE_OUT:</span>
                                                    <span className="text-neon-green">{(selectedClip.fadeOut || 0).toFixed(1)}s</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="5"
                                                    step="0.1"
                                                    value={selectedClip.fadeOut || 0}
                                                    onChange={(e) => {
                                                        const newClips = [...processedClips]
                                                        newClips[selectedClipIndex].fadeOut = parseFloat(e.target.value)
                                                        setProcessedClips(newClips)
                                                    }}
                                                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:rounded-full"
                                                />
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


                {/* REMOVED: Subtitle Editor Modal */}

            </div>
        </div >
    )
}

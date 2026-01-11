'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '@/lib/estimateTime'

interface SubtitleSegment {
    id: string
    start: number
    end: number
    text: string
}

interface SubtitleEditorProps {
    isOpen: boolean
    onClose: () => void
    videoPath: string
    initialSegments?: SubtitleSegment[] // If existing segments
    onSave: (segments: SubtitleSegment[]) => Promise<void>
}

export default function SubtitleEditor({ isOpen, onClose, videoPath, initialSegments = [], onSave }: SubtitleEditorProps) {
    const [segments, setSegments] = useState<SubtitleSegment[]>(initialSegments)
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState<'transcribe' | 'edit'>('transcribe')
    const [videoTime, setVideoTime] = useState(0)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Scroll to active segment based on video time
    const activeSegmentRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && initialSegments.length > 0) {
            setSegments(initialSegments)
            setCurrentStep('edit')
        }
    }, [isOpen, initialSegments])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'Escape') {
                onClose()
            }
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (currentStep === 'edit' && segments.length > 0) {
                    handleSave()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentStep, segments])

    const handleTranscribe = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath: videoPath })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Transcribe failed')
            }

            const data = await res.json()
            setSegments(data.segments)
            setCurrentStep('edit')
        } catch (error) {
            console.error(error)
            alert('Transkripsiyon hatası: ' + error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSegmentChange = (index: number, field: keyof SubtitleSegment, value: any) => {
        const newSegments = [...segments]
        newSegments[index] = { ...newSegments[index], [field]: value }
        setSegments(newSegments)
    }

    const handleDeleteSegment = (index: number) => {
        const newSegments = segments.filter((_, i) => i !== index)
        setSegments(newSegments)
    }

    const handleAddSegment = () => {
        const lastSeg = segments[segments.length - 1]
        const newStart = lastSeg ? lastSeg.end + 0.1 : 0
        const newEnd = newStart + 2.0

        setSegments([...segments, {
            id: Date.now().toString(),
            start: parseFloat(newStart.toFixed(2)),
            end: parseFloat(newEnd.toFixed(2)),
            text: 'Yeni altyazı'
        }])
    }

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setVideoTime(videoRef.current.currentTime)
        }
    }

    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time
            videoRef.current.play()
        }
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            await onSave(segments)
            onClose()
        } catch (error) {
            console.error(error)
            alert('Kaydetme hatası')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            >
                <div className="w-full max-w-6xl h-[90vh] bg-[#0a0a0a] border border-neon-green/30 rounded-lg flex flex-col overflow-hidden relative">

                    {/* Header */}
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/50">
                        <div className="flex items-center gap-2">
                            <span className="text-neon-green font-pixel">SUBTITLE_STUDIO</span>
                            <span className="text-xs text-gray-500 font-mono">v1.0</span>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white font-mono">[X] CLOSE</button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex overflow-hidden">

                        {/* Left: Video Preview */}
                        <div className="w-1/2 p-4 flex flex-col border-r border-gray-800">
                            <div className="relative aspect-video bg-black rounded border border-gray-800 overflow-hidden mb-4 group">
                                <video
                                    ref={videoRef}
                                    src={videoPath}
                                    className="w-full h-full object-contain"
                                    controls
                                    onTimeUpdate={handleTimeUpdate}
                                />
                            </div>

                            <div className="font-mono text-xs text-gray-500 text-center">
                                PREVIEW_MODE: {formatTime(videoTime)}
                            </div>
                        </div>

                        {/* Right: Editor */}
                        <div className="w-1/2 flex flex-col bg-[#111]">
                            {currentStep === 'transcribe' ? (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-10">
                                    <div className="text-4xl">🎙️</div>
                                    <h3 className="text-xl font-bold text-white">AI Transkripsiyon</h3>
                                    <p className="text-gray-400 text-center text-sm">
                                        Videodaki konuşmaları otomatik olarak metne dönüştür ve zamanla.
                                    </p>

                                    <button
                                        onClick={handleTranscribe}
                                        disabled={isLoading}
                                        className="btn-primary px-8 py-3 w-full max-w-xs flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="animate-spin">⏳</span> ANALYZING...
                                            </>
                                        ) : (
                                            '[START TRANSCRIPTION]'
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Segment List */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                        {segments.map((seg, idx) => {
                                            const isActive = videoTime >= seg.start && videoTime <= seg.end
                                            return (
                                                <div
                                                    key={seg.id}
                                                    ref={isActive ? activeSegmentRef : null}
                                                    className={`p-3 rounded border transition-colors ${isActive
                                                        ? 'bg-neon-green/10 border-neon-green'
                                                        : 'bg-black border-gray-800 hover:border-gray-600'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div
                                                            className="flex items-center gap-1 font-mono text-[10px] text-neon-cyan cursor-pointer hover:underline"
                                                            onClick={() => seekTo(seg.start)}
                                                        >
                                                            <span>⏱️</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={seg.start}
                                                                onChange={(e) => handleSegmentChange(idx, 'start', parseFloat(e.target.value))}
                                                                className="bg-transparent w-12 text-center border-b border-gray-700 focus:border-neon-cyan outline-none"
                                                            />
                                                            <span>-</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={seg.end}
                                                                onChange={(e) => handleSegmentChange(idx, 'end', parseFloat(e.target.value))}
                                                                className="bg-transparent w-12 text-center border-b border-gray-700 focus:border-neon-cyan outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1" />
                                                        <button
                                                            onClick={() => handleDeleteSegment(idx)}
                                                            className="text-red-500 hover:text-red-400 text-xs px-2"
                                                        >
                                                            DEL
                                                        </button>
                                                    </div>

                                                    <textarea
                                                        value={seg.text}
                                                        onChange={(e) => handleSegmentChange(idx, 'text', e.target.value)}
                                                        className="w-full bg-transparent text-sm text-gray-200 focus:text-white outline-none resize-none font-sans"
                                                        rows={2}
                                                    />
                                                </div>
                                            )
                                        })}

                                        <button
                                            onClick={handleAddSegment}
                                            className="w-full py-3 border border-dashed border-gray-700 text-gray-500 hover:border-neon-green hover:text-neon-green font-mono text-xs rounded transition-colors"
                                        >
                                            + ADD NEW SEGMENT
                                        </button>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="p-4 border-t border-gray-800 bg-black/50 flex justify-between items-center">
                                        <div className="text-xs text-gray-500 font-mono">
                                            {segments.length} SEGMENTS
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setCurrentStep('transcribe')}
                                                className="px-4 py-2 text-xs text-gray-400 hover:text-white font-mono"
                                            >
                                                RE-TRANSCRIBE
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={isLoading}
                                                className="btn-primary px-6 py-2 text-xs"
                                            >
                                                {isLoading ? 'RENDERING...' : '[APPLY & BURN]'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

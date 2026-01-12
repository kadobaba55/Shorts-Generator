'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '@/lib/estimateTime'

interface SubtitleSegment {
    id: string
    start: number
    end: number
    text: string
}

interface SubtitleStyle {
    id: string
    name: string
    font: string
    primaryColor: string
    outlineColor: string
    fontSize: number
}

interface SubtitleEditorProps {
    isOpen: boolean
    onClose: () => void
    videoPath: string
    initialSegments?: SubtitleSegment[]
    onSave: (segments: SubtitleSegment[], style: SubtitleStyle) => Promise<void>
}

// Predefined styles
const STYLES: SubtitleStyle[] = [
    { id: 'viral', name: '🔥 Viral', font: 'Impact', primaryColor: '#00FFFF', outlineColor: '#000000', fontSize: 32 },
    { id: 'neon', name: '✨ Neon', font: 'Arial Black', primaryColor: '#FF00FF', outlineColor: '#000000', fontSize: 30 },
    { id: 'minimal', name: '🎯 Minimal', font: 'Roboto', primaryColor: '#FFFFFF', outlineColor: '#404040', fontSize: 24 },
    { id: 'karaoke', name: '🎤 Karaoke', font: 'Comic Sans MS', primaryColor: '#FFD700', outlineColor: '#000000', fontSize: 28 },
]

// Available fonts
const FONTS = ['Impact', 'Arial Black', 'Roboto', 'Comic Sans MS', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana']

// Color presets
const COLOR_PRESETS = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00', '#FF0000', '#FFFFFF', '#FFD700', '#FF6B6B']

// Position options
const POSITIONS = [
    { id: 'bottom', name: 'Alt', marginV: 60 },
    { id: 'middle', name: 'Orta', marginV: 200 },
    { id: 'top', name: 'Üst', marginV: 400 },
]

// Animation options
const ANIMATIONS = [
    { id: 'none', name: 'Yok', icon: '—' },
    { id: 'pop', name: 'Pop', icon: '💫' },
    { id: 'fade', name: 'Fade', icon: '🌫️' },
    { id: 'slide', name: 'Slide', icon: '➡️' },
]

export default function SubtitleEditor({ isOpen, onClose, videoPath, initialSegments = [], onSave }: SubtitleEditorProps) {
    // Core state
    const [segments, setSegments] = useState<SubtitleSegment[]>(initialSegments)
    const [isLoading, setIsLoading] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState<string>('')
    const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
    const [currentStep, setCurrentStep] = useState<'transcribe' | 'edit'>('transcribe')
    const [videoTime, setVideoTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Styling state
    const [selectedStyle, setSelectedStyle] = useState<SubtitleStyle>(STYLES[0])
    const [customFont, setCustomFont] = useState('Impact')
    const [customColor, setCustomColor] = useState('#00FFFF')
    const [position, setPosition] = useState('bottom')
    const [animation, setAnimation] = useState('none')
    const [showStylePanel, setShowStylePanel] = useState(false)

    // Undo/Redo state
    const [history, setHistory] = useState<SubtitleSegment[][]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Drag state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    // Active segment for live preview
    const activeSegment = segments.find(seg => videoTime >= seg.start && videoTime <= seg.end)

    // Initialize with segments
    useEffect(() => {
        if (isOpen && initialSegments.length > 0) {
            setSegments(initialSegments)
            setCurrentStep('edit')
            pushToHistory(initialSegments)
        }
    }, [isOpen, initialSegments])

    // Push state to history for undo/redo
    const pushToHistory = useCallback((newSegments: SubtitleSegment[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1)
            newHistory.push(JSON.parse(JSON.stringify(newSegments)))
            return newHistory
        })
        setHistoryIndex(prev => prev + 1)
    }, [historyIndex])

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1)
            setSegments(JSON.parse(JSON.stringify(history[historyIndex - 1])))
        }
    }, [history, historyIndex])

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1)
            setSegments(JSON.parse(JSON.stringify(history[historyIndex + 1])))
        }
    }, [history, historyIndex])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            // Escape to close
            if (e.key === 'Escape') {
                onClose()
                return
            }

            // Space to play/pause (prevent if typing in textarea)
            if (e.key === ' ' && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
                e.preventDefault()
                togglePlay()
                return
            }

            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (currentStep === 'edit' && segments.length > 0) {
                    handleSave()
                }
                return
            }

            // Ctrl/Cmd + Z to undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                undo()
                return
            }

            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                redo()
                return
            }

            // Arrow keys for seeking
            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                seekRelative(-1)
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault()
                seekRelative(1)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentStep, segments, undo, redo])

    // Toggle play/pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play()
                setIsPlaying(true)
            } else {
                videoRef.current.pause()
                setIsPlaying(false)
            }
        }
    }

    // Seek relative
    const seekRelative = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += seconds
        }
    }



    // ... existing code ...

    // Transcribe
    const handleTranscribe = async () => {
        setIsLoading(true)
        // Estimate time: Video duration * 1.2 (safety margin for CPU)
        if (videoRef.current?.duration) {
            setSecondsRemaining(Math.ceil(videoRef.current.duration * 1.2))
        } else {
            setSecondsRemaining(60) // Default fallback
        }

        try {
            const res = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoPath })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Transcribe failed')
            }

            const { jobId } = await res.json()

            // Poll for job completion
            const pollForResult = async (): Promise<SubtitleSegment[]> => {
                return new Promise((resolve, reject) => {
                    const interval = setInterval(async () => {
                        try {
                            // Decrement timer
                            setSecondsRemaining(prev => Math.max(0, prev - 1))

                            const statusRes = await fetch(`/api/status?id=${jobId}`)
                            if (!statusRes.ok) return

                            const job = await statusRes.json()

                            // Update status message
                            if (job.message) {
                                setLoadingStatus(job.message)
                            }
                            if (job.queuePosition !== undefined) {
                                setLoadingStatus(`Sırada: ${job.queuePosition}. Kişi`)
                            }

                            if (job.status === 'completed' && job.result?.segments) {
                                clearInterval(interval)
                                resolve(job.result.segments)
                            } else if (job.status === 'error') {
                                clearInterval(interval)
                                reject(new Error(job.error || 'Transcription failed'))
                            }
                        } catch (e) {
                            console.error('Polling error:', e)
                        }
                    }, 1000)

                    setTimeout(() => {
                        clearInterval(interval)
                        reject(new Error('Transcription timed out'))
                    }, 10 * 60 * 1000) // 10 min timeout
                })
            }

            const newSegments = await pollForResult()
            setSegments(newSegments)
            pushToHistory(newSegments)
            setCurrentStep('edit')
        } catch (error) {
            console.error(error)
            alert('Transkripsiyon hatası: ' + error)
        } finally {
            setIsLoading(false)
            setSecondsRemaining(0)
        }
    }

    // Segment change with history
    const handleSegmentChange = (index: number, field: keyof SubtitleSegment, value: any) => {
        const newSegments = [...segments]
        newSegments[index] = { ...newSegments[index], [field]: value }
        setSegments(newSegments)
    }

    // Commit change to history on blur
    const commitChange = () => {
        pushToHistory(segments)
    }

    // Delete segment
    const handleDeleteSegment = (index: number) => {
        const newSegments = segments.filter((_, i) => i !== index)
        setSegments(newSegments)
        pushToHistory(newSegments)
    }

    // Add segment
    const handleAddSegment = () => {
        const lastSeg = segments[segments.length - 1]
        const newStart = lastSeg ? lastSeg.end + 0.1 : 0
        const newEnd = newStart + 2.0

        const newSegments = [...segments, {
            id: Date.now().toString(),
            start: parseFloat(newStart.toFixed(2)),
            end: parseFloat(newEnd.toFixed(2)),
            text: 'Yeni altyazı'
        }]
        setSegments(newSegments)
        pushToHistory(newSegments)
    }

    // Time update
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setVideoTime(videoRef.current.currentTime)
        }
    }

    // Seek to time
    const seekTo = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time
            videoRef.current.play()
            setIsPlaying(true)
        }
    }

    // Save with style
    const handleSave = async () => {
        setIsLoading(true)
        try {
            const styleToSave: SubtitleStyle = {
                ...selectedStyle,
                font: customFont,
                primaryColor: customColor,
            }
            await onSave(segments, styleToSave)
            onClose()
        } catch (error) {
            console.error(error)
            alert('Kaydetme hatası')
        } finally {
            setIsLoading(false)
        }
    }

    // Apply style preset
    const applyStylePreset = (style: SubtitleStyle) => {
        setSelectedStyle(style)
        setCustomFont(style.font)
        setCustomColor(style.primaryColor)
    }

    // Highlight word (wrap in special markers)
    const highlightWord = (segmentIndex: number) => {
        const seg = segments[segmentIndex]
        if (!seg) return

        const selection = window.getSelection()
        if (!selection || selection.toString().length === 0) return

        const selectedText = selection.toString()
        const newText = seg.text.replace(selectedText, `**${selectedText}**`)

        handleSegmentChange(segmentIndex, 'text', newText)
        commitChange()
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2 md:p-4"
            >
                <div className="w-full max-w-7xl h-[95vh] bg-[#0a0a0a] border border-neon-green/30 rounded-lg flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-black/50">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-neon-green font-pixel">SUBTITLE_STUDIO</span>
                                <span className="text-xs text-gray-500 font-mono">v2.0</span>
                            </div>
                            {currentStep === 'edit' && (
                                <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 font-mono">
                                    <span className="px-2 py-0.5 bg-gray-800 rounded">SPACE: ▶️</span>
                                    <span className="px-2 py-0.5 bg-gray-800 rounded">←→: Seek</span>
                                    <span className="px-2 py-0.5 bg-gray-800 rounded">Ctrl+Z: Undo</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {historyIndex > 0 && (
                                <button onClick={undo} className="text-gray-400 hover:text-white text-sm font-mono">
                                    ↩️ Undo
                                </button>
                            )}
                            {historyIndex < history.length - 1 && (
                                <button onClick={redo} className="text-gray-400 hover:text-white text-sm font-mono">
                                    ↪️ Redo
                                </button>
                            )}
                            <button onClick={onClose} className="text-gray-400 hover:text-white font-mono">
                                [X] CLOSE
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex overflow-hidden">

                        {/* Left: Video Preview with Live Subtitles */}
                        <div className="w-1/2 p-4 flex flex-col border-r border-gray-800">
                            <div className="relative aspect-video bg-black rounded border border-gray-800 overflow-hidden mb-4">
                                <video
                                    ref={videoRef}
                                    src={videoPath}
                                    className="w-full h-full object-contain"
                                    onTimeUpdate={handleTimeUpdate}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                />

                                {/* Live Subtitle Preview Overlay */}
                                {activeSegment && currentStep === 'edit' && (
                                    <div
                                        className={`absolute left-0 right-0 px-4 text-center pointer-events-none ${position === 'bottom' ? 'bottom-8' :
                                            position === 'middle' ? 'top-1/2 -translate-y-1/2' :
                                                'top-8'
                                            }`}
                                    >
                                        <motion.span
                                            key={activeSegment.id}
                                            initial={
                                                animation === 'pop' ? { scale: 0.5, opacity: 0 } :
                                                    animation === 'fade' ? { opacity: 0 } :
                                                        animation === 'slide' ? { x: -50, opacity: 0 } :
                                                            {}
                                            }
                                            animate={
                                                animation === 'pop' ? { scale: 1, opacity: 1 } :
                                                    animation === 'fade' ? { opacity: 1 } :
                                                        animation === 'slide' ? { x: 0, opacity: 1 } :
                                                            {}
                                            }
                                            className="inline-block px-3 py-1 rounded"
                                            style={{
                                                fontFamily: customFont,
                                                fontSize: `${selectedStyle.fontSize}px`,
                                                color: customColor,
                                                textShadow: `2px 2px 4px ${selectedStyle.outlineColor}, -2px -2px 4px ${selectedStyle.outlineColor}`,
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {activeSegment.text.replace(/\*\*/g, '')}
                                        </motion.span>
                                    </div>
                                )}

                                {/* Play/Pause Overlay Button */}
                                <button
                                    onClick={togglePlay}
                                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                                >
                                    <span className="text-6xl">{isPlaying ? '⏸️' : '▶️'}</span>
                                </button>
                            </div>

                            {/* Video Controls */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="font-mono text-xs text-gray-500">
                                    {formatTime(videoTime)}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => seekRelative(-5)} className="px-2 py-1 bg-gray-800 rounded text-xs hover:bg-gray-700">
                                        -5s
                                    </button>
                                    <button onClick={togglePlay} className="px-4 py-1 bg-neon-green/20 border border-neon-green rounded text-xs text-neon-green hover:bg-neon-green/30">
                                        {isPlaying ? 'PAUSE' : 'PLAY'}
                                    </button>
                                    <button onClick={() => seekRelative(5)} className="px-2 py-1 bg-gray-800 rounded text-xs hover:bg-gray-700">
                                        +5s
                                    </button>
                                </div>
                            </div>

                            {/* Style Panel Toggle */}
                            {currentStep === 'edit' && (
                                <button
                                    onClick={() => setShowStylePanel(!showStylePanel)}
                                    className="w-full py-2 border border-neon-purple/50 text-neon-purple font-mono text-xs rounded hover:bg-neon-purple/10 transition-colors"
                                >
                                    🎨 {showStylePanel ? 'HIDE STYLE PANEL' : 'SHOW STYLE PANEL'}
                                </button>
                            )}

                            {/* Style Panel */}
                            {showStylePanel && currentStep === 'edit' && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    className="mt-4 p-4 bg-gray-900/50 border border-gray-700 rounded space-y-4"
                                >
                                    {/* Style Presets */}
                                    <div>
                                        <div className="text-xs text-gray-400 mb-2">PRESETS:</div>
                                        <div className="flex gap-2 flex-wrap">
                                            {STYLES.map(style => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => applyStylePreset(style)}
                                                    className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${selectedStyle.id === style.id
                                                        ? 'bg-neon-green text-black'
                                                        : 'bg-gray-800 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {style.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Font Selection */}
                                    <div>
                                        <div className="text-xs text-gray-400 mb-2">FONT:</div>
                                        <select
                                            value={customFont}
                                            onChange={(e) => setCustomFont(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                                        >
                                            {FONTS.map(font => (
                                                <option key={font} value={font}>{font}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Color Selection */}
                                    <div>
                                        <div className="text-xs text-gray-400 mb-2">COLOR:</div>
                                        <div className="flex gap-2 flex-wrap">
                                            {COLOR_PRESETS.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setCustomColor(color)}
                                                    className={`w-8 h-8 rounded border-2 transition-transform ${customColor === color ? 'border-white scale-110' : 'border-gray-600'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                            <input
                                                type="color"
                                                value={customColor}
                                                onChange={(e) => setCustomColor(e.target.value)}
                                                className="w-8 h-8 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    {/* Position Selection */}
                                    <div>
                                        <div className="text-xs text-gray-400 mb-2">POSITION:</div>
                                        <div className="flex gap-2">
                                            {POSITIONS.map(pos => (
                                                <button
                                                    key={pos.id}
                                                    onClick={() => setPosition(pos.id)}
                                                    className={`flex-1 px-3 py-2 rounded text-xs font-mono transition-colors ${position === pos.id
                                                        ? 'bg-neon-cyan text-black'
                                                        : 'bg-gray-800 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {pos.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Animation Selection */}
                                    <div>
                                        <div className="text-xs text-gray-400 mb-2">ANIMATION:</div>
                                        <div className="flex gap-2">
                                            {ANIMATIONS.map(anim => (
                                                <button
                                                    key={anim.id}
                                                    onClick={() => setAnimation(anim.id)}
                                                    className={`flex-1 px-3 py-2 rounded text-xs font-mono transition-colors ${animation === anim.id
                                                        ? 'bg-neon-amber text-black'
                                                        : 'bg-gray-800 hover:bg-gray-700'
                                                        }`}
                                                >
                                                    {anim.icon} {anim.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Right: Editor */}
                        <div className="w-1/2 flex flex-col bg-[#111]">
                            {currentStep === 'transcribe' ? (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-10">
                                    <div className="text-6xl">🎙️</div>
                                    <h3 className="text-2xl font-bold text-white">AI Transkripsiyon</h3>
                                    <p className="text-gray-400 text-center text-sm max-w-sm">
                                        Videodaki konuşmaları yapay zeka ile otomatik olarak metne dönüştür ve zamanla.
                                    </p>

                                    <button
                                        onClick={handleTranscribe}
                                        disabled={isLoading}
                                        className="btn-primary px-8 py-4 w-full max-w-xs flex items-center justify-center gap-2 text-lg relative overflow-hidden group"
                                    >
                                        {isLoading ? (
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="animate-spin text-xl">⏳</span>
                                                    <span>{secondsRemaining > 0 ? `${secondsRemaining}s` : 'PROCESSING'}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-neon-black/80 mt-1 animate-pulse">
                                                    {loadingStatus || 'Başlatılıyor...'}
                                                </span>
                                            </div>
                                        ) : (
                                            '🚀 START TRANSCRIPTION'
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
                                                    className={`p-3 rounded border transition-all cursor-move ${isActive
                                                        ? 'bg-neon-green/10 border-neon-green shadow-lg shadow-neon-green/20'
                                                        : 'bg-black border-gray-800 hover:border-gray-600'
                                                        }`}
                                                    draggable
                                                    onDragStart={() => setDraggedIndex(idx)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => {
                                                        if (draggedIndex !== null && draggedIndex !== idx) {
                                                            const newSegments = [...segments]
                                                            const [removed] = newSegments.splice(draggedIndex, 1)
                                                            newSegments.splice(idx, 0, removed)
                                                            setSegments(newSegments)
                                                            pushToHistory(newSegments)
                                                        }
                                                        setDraggedIndex(null)
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-gray-600 cursor-move">⠿</span>
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
                                                                onBlur={commitChange}
                                                                className="bg-transparent w-14 text-center border-b border-gray-700 focus:border-neon-cyan outline-none"
                                                            />
                                                            <span>→</span>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                value={seg.end}
                                                                onChange={(e) => handleSegmentChange(idx, 'end', parseFloat(e.target.value))}
                                                                onBlur={commitChange}
                                                                className="bg-transparent w-14 text-center border-b border-gray-700 focus:border-neon-cyan outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex-1" />
                                                        <button
                                                            onClick={() => highlightWord(idx)}
                                                            className="text-neon-amber hover:text-neon-amber/80 text-xs px-2"
                                                            title="Select text and click to highlight"
                                                        >
                                                            ✨
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSegment(idx)}
                                                            className="text-red-500 hover:text-red-400 text-xs px-2"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>

                                                    <textarea
                                                        value={seg.text}
                                                        onChange={(e) => handleSegmentChange(idx, 'text', e.target.value)}
                                                        onBlur={commitChange}
                                                        className="w-full bg-transparent text-sm text-gray-200 focus:text-white outline-none resize-none font-sans"
                                                        rows={2}
                                                    />
                                                </div>
                                            )
                                        })}

                                        <button
                                            onClick={handleAddSegment}
                                            className="w-full py-4 border border-dashed border-gray-700 text-gray-500 hover:border-neon-green hover:text-neon-green font-mono text-sm rounded transition-colors"
                                        >
                                            + ADD NEW SEGMENT
                                        </button>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="p-4 border-t border-gray-800 bg-black/50 flex justify-between items-center">
                                        <div className="text-xs text-gray-500 font-mono">
                                            {segments.length} SEGMENTS | {historyIndex + 1}/{history.length} HISTORY
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
                                                className="btn-primary px-6 py-2 text-sm"
                                            >
                                                {isLoading ? '🔄 RENDERING...' : '🎬 APPLY & BURN'}
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

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '@/lib/estimateTime'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { SUBTITLE_PRESETS, ALL_FONTS, SubtitlePreset } from '@/lib/subtitlePresets'
import { useLanguage } from './LanguageProvider'

export interface SubtitleSegment {
    id: string
    start: number
    end: number
    text: string
}

export interface SubtitleStyle {
    id: string
    name: string
    font: string
    primaryColor: string
    outlineColor: string
    fontSize: number
    // Extended properties
    bgEnabled?: boolean
    bgColor?: string
    bgOpacity?: number
    bgBlur?: boolean
    bgRadius?: number
    shadowEnabled?: boolean
    shadowColor?: string
    shadowBlur?: number
    animation?: string
    animationSpeed?: number
}

interface SubtitlePageProps {
    videoPath: string
    initialSegments?: SubtitleSegment[]
    onSave: (segments: SubtitleSegment[], style: SubtitleStyle) => Promise<void>
    onBack: () => void
    isLoading?: boolean
}

// Color presets
const COLOR_PRESETS = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00', '#FF0000', '#FFFFFF', '#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6']

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
    { id: 'bounce', name: 'Bounce', icon: '🔄' },
    { id: 'typewriter', name: 'Typewriter', icon: '⌨️' },
]

const hexToRgba = (hex: string, alpha: number) => {
    if (!hex) return 'transparent'
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function SubtitlePage({ videoPath, initialSegments = [], onSave, onBack }: SubtitlePageProps) {
    // Localization
    const { t } = useLanguage()

    // Core state
    const [segments, setSegments] = useState<SubtitleSegment[]>(initialSegments)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState<string>('')
    const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
    const [currentStep, setCurrentStep] = useState<'transcribe' | 'edit'>('transcribe')
    const [videoTime, setVideoTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [transcribeLanguage, setTranscribeLanguage] = useState('tr')
    const videoRef = useRef<HTMLVideoElement>(null)

    // Styling state
    const [selectedPreset, setSelectedPreset] = useState<SubtitlePreset>(SUBTITLE_PRESETS[0])
    const [customFont, setCustomFont] = useState('Impact')
    const [customColor, setCustomColor] = useState('#00FFFF')
    const [position, setPosition] = useState('bottom')
    const [animation, setAnimation] = useState('pop')
    const [animationSpeed, setAnimationSpeed] = useState(1.0)
    const [showStylePanel, setShowStylePanel] = useState(true)
    // Background box state
    const [bgEnabled, setBgEnabled] = useState(false)
    const [bgColor, setBgColor] = useState('#000000')
    const [bgOpacity, setBgOpacity] = useState(0.5)
    const [bgBlur, setBgBlur] = useState(false)
    const [bgRadius, setBgRadius] = useState(8)
    // Keyboard shortcuts modal
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

    // Waveform state
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [waveformPeaks, setWaveformPeaks] = useState<number[]>([])

    // Undo/Redo state
    const [history, setHistory] = useState<SubtitleSegment[][]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Load waveform data
    useEffect(() => {
        if (!videoPath) return

        const fetchAudio = async () => {
            try {
                const response = await fetch(videoPath)
                const arrayBuffer = await response.arrayBuffer()
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

                const rawData = audioBuffer.getChannelData(0)
                const samples = 100 // bars to show
                const blockSize = Math.floor(rawData.length / samples)
                const peaks = []
                for (let i = 0; i < samples; i++) {
                    const start = blockSize * i
                    let sum = 0
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(rawData[start + j])
                    }
                    peaks.push(sum / blockSize)
                }
                // Normalize
                const max = Math.max(...peaks)
                setWaveformPeaks(peaks.map(p => p / max))
            } catch (e) {
                console.error('Waveform load error:', e)
            }
        }
        fetchAudio()
    }, [videoPath])

    // Draw Waveform
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || waveformPeaks.length === 0) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = canvas.offsetWidth * dpr
        canvas.height = canvas.offsetHeight * dpr
        ctx.scale(dpr, dpr)

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#00ff41' // neon green use variable

        const width = canvas.offsetWidth
        const height = canvas.offsetHeight
        const barWidth = width / waveformPeaks.length

        waveformPeaks.forEach((peak, i) => {
            const barHeight = peak * height * 0.8
            const x = i * barWidth
            const y = (height - barHeight) / 2

            ctx.globalAlpha = 0.3
            ctx.fillRect(x, y, barWidth - 1, barHeight)
        })
    }, [waveformPeaks])

    // Undo/Redo Logic
    const applyHistoryState = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < history.length) {
            setSegments(history[newIndex])
            setHistoryIndex(newIndex)
            setHasUnsavedChanges(true)
        }
    }

    // Add to history
    const pushToHistory = (newSegments: SubtitleSegment[]) => {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(newSegments)

        // Limit history size
        if (newHistory.length > 10) {
            newHistory.shift()
        }

        setHistory(newHistory)
        setHistoryIndex(newHistory.length - 1)
        setHasUnsavedChanges(true)
    }

    // Add style change to history (special case, doesn't change segments but we want undo)
    // Actually style changes are currently just state, not undoable. 
    // User requested undo/redo visual history, usually implies segments.
    // If we want style undo, we need to store style in history too.
    // For now, let's keep it simple as requested: "Undo/Redo ve klavye kısayolları"
    // But we SHOULD mark as unsaved.
    const markAsUnsaved = () => {
        setHasUnsavedChanges(true)
    }

    const handleUndo = () => {
        if (historyIndex > 0) {
            setSegments(JSON.parse(JSON.stringify(history[historyIndex - 1])))
        }
    }

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1)
            setSegments(JSON.parse(JSON.stringify(history[historyIndex + 1])))
        }
    }

    // Capture initial state
    useEffect(() => {
        if (initialSegments.length > 0 && history.length === 0) {
            setHistory([JSON.parse(JSON.stringify(initialSegments))])
            setHistoryIndex(0)
        }
    }, [initialSegments])

    // Drag state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

    // Active segment for live preview
    const activeSegment = segments.find(seg => videoTime >= seg.start && videoTime <= seg.end)

    // Initialize with segments
    useEffect(() => {
        if (initialSegments.length > 0) {
            setSegments(initialSegments)
            setCurrentStep('edit')
            pushToHistory(initialSegments)
        }
    }, [initialSegments])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Help Modal Toggle
            if (e.key === '?' && e.shiftKey) {
                e.preventDefault()
                setShowKeyboardHelp(prev => !prev)
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
                handleUndo()
                return
            }

            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                handleRedo()
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
    }, [currentStep, segments, history, historyIndex])

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

    // Transcribe
    const handleTranscribe = async () => {
        setIsTranscribing(true)
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
                body: JSON.stringify({ videoPath, language: transcribeLanguage })
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
            toast.error('Transkripsiyon hatası')
        } finally {
            setIsTranscribing(false)
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
        setIsSaving(true)
        try {
            const styleToSave: SubtitleStyle = {
                ...selectedPreset,
                font: customFont,
                primaryColor: customColor,
            }
            await onSave(segments, styleToSave)
            setHasUnsavedChanges(false)
            toast.success(t('success'))
        } catch (error) {
            console.error(error)
            toast.error(t('error'))
        } finally {
            setIsSaving(false)
        }
    }

    // Handle Back with confirmation and cleanup
    const handleBack = async () => {
        if (hasUnsavedChanges) {
            if (!window.confirm(t('editor.unsavedChanges'))) {
                return
            }
        }

        // Trigger cleanup (fire and forget or await?)
        // Better to fire and forget so UI doesn't lag, 
        // OR await to ensure it starts before page unmount kills it?
        // fetch (keepalive: true) is best for unmount.
        try {
            if (videoPath) {
                // Delete the file from R2
                // We use keepalive so it survives page navigation
                fetch('/api/cleanup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoPath }),
                    keepalive: true
                }).catch(err => console.error('Cleanup error:', err))
            }
        } catch (e) {
            console.error('Cleanup trigger error:', e)
        }

        onBack()
    }

    // Apply style preset
    const applyStylePreset = (preset: SubtitlePreset) => {
        setSelectedPreset(preset)
        setCustomFont(preset.font)
        setCustomColor(preset.primaryColor)
        setPosition('bottom') // Default position
        setAnimation(preset.animation || 'pop')
        setAnimationSpeed(preset.animationSpeed || 1.0)

        // Background settings
        setBgEnabled(preset.bgEnabled || false)
        setBgColor(preset.bgColor || '#000000')
        setBgOpacity(preset.bgOpacity ?? 0.5)
        setBgBlur(preset.bgBlur || false)
        setBgRadius(preset.bgRadius ?? 8)

        // Mark as unsaved since style changed
        markAsUnsaved()
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

    return (
        <main className="min-h-screen bg-bg-terminal text-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-bg-card">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="font-mono text-xs text-neon-amber hover:text-neon-green transition-colors"
                        >
                            [&larr; {t('editor.back')}]
                        </button>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-neon-green font-pixel">{t('editor.subtitleStudio')}</span>
                            <span className="text-xs text-gray-500 font-mono hidden sm:inline">PRO</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {currentStep === 'edit' && (
                        <div className="flex items-center gap-4">
                            <div className="flex bg-gray-900 rounded border border-gray-800 p-1">
                                <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-1.5 hover:bg-gray-800 rounded text-gray-400 disabled:opacity-30" title="Undo (Ctrl+Z)">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                </button>
                                <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-gray-800 rounded text-gray-400 disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                                </button>
                                <button onClick={() => setShowKeyboardHelp(true)} className="p-1.5 hover:bg-gray-800 rounded text-gray-400" title="Shortcuts (?)">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </button>
                            </div>

                            <div className="text-xs text-gray-500 font-mono hidden md:block">
                                SPACE: Play/Pause  Ctrl+S: Save
                            </div>
                            {isSaving ? (
                                <button
                                    disabled
                                    className="btn-primary px-6 py-2 text-sm ml-2 flex items-center gap-2 opacity-80 cursor-not-allowed"
                                >
                                    <span className="animate-spin">⏳</span>
                                    {t('editor.saving')}
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    className="btn-primary px-6 py-2 text-sm ml-2 flex items-center gap-2"
                                >
                                    💾 {t('editor.saveApply')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* Left: Video Preview with Live Subtitles - Only show in edit mode */}
                {currentStep === 'edit' && (
                    <div className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 bg-black/20">
                        <div className="relative aspect-[9/16] max-h-[50vh] lg:max-h-[70vh] mx-auto bg-black rounded border border-gray-800 overflow-hidden mb-4 lg:mb-6 shadow-2xl shadow-neon-green/5">
                            <video
                                ref={videoRef}
                                src={videoPath}
                                className="w-full h-full object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                playsInline
                            />

                            {/* Live Subtitle Preview Overlay */}
                            {activeSegment && (
                                <div
                                    className={`absolute left-0 right-0 px-4 text-center pointer-events-none ${position === 'bottom' ? 'bottom-16' :
                                        position === 'middle' ? 'top-1/2 -translate-y-1/2' :
                                            'top-16'
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
                                        className="inline-block px-3 py-1 rounded leading-normal"
                                        style={{
                                            fontFamily: customFont,
                                            fontSize: `${selectedPreset.fontSize}px`,
                                            color: customColor,
                                            textShadow: `2px 2px 4px ${selectedPreset.outlineColor}, -2px -2px 4px ${selectedPreset.outlineColor}`,
                                            fontWeight: 'bold',
                                            backgroundColor: bgEnabled ? hexToRgba(bgColor, bgOpacity) : 'transparent',
                                            borderRadius: bgEnabled ? `${bgRadius}px` : '0',
                                            padding: bgEnabled ? '0.2em 0.6em' : '0',
                                            backdropFilter: bgEnabled && bgBlur ? 'blur(4px)' : 'none',
                                            boxShadow: bgEnabled ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
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
                                <span className="text-6xl filter drop-shadow-lg">{isPlaying ? '⏸️' : '▶️'}</span>
                            </button>
                        </div>

                        {/* Video Controls */}
                        <div className="max-w-md mx-auto w-full">
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-mono text-sm text-neon-green">
                                    {formatTime(videoTime)}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => seekRelative(-5)} className="px-3 py-1.5 bg-gray-800 rounded text-xs hover:bg-gray-700 font-mono">
                                        -5s
                                    </button>
                                    <button onClick={togglePlay} className="px-6 py-1.5 bg-neon-green/10 border border-neon-green rounded text-xs text-neon-green hover:bg-neon-green/20 font-mono w-24">
                                        {isPlaying ? 'PAUSE' : 'PLAY'}
                                    </button>
                                    <button onClick={() => seekRelative(5)} className="px-3 py-1.5 bg-gray-800 rounded text-xs hover:bg-gray-700 font-mono">
                                        +5s
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right: Editor Panels */}
                <div className={`flex flex-col bg-[#0f0f0f] flex-1 ${currentStep === 'transcribe' ? 'w-full' : 'w-full lg:w-1/2'} border-l border-gray-800`}>
                    {currentStep === 'transcribe' ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-6 lg:p-10">
                            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-neon-green/10 flex items-center justify-center border border-neon-green/30">
                                <span className="text-3xl lg:text-4xl">🎙️</span>
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">AI Transkripsiyon</h3>
                                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                                    Videodaki konuşmaları yapay zeka ile otomatik olarak metne dönüştür.
                                </p>
                            </div>

                            {/* Language Selection */}
                            <div className="w-full max-w-xs space-y-2">
                                <label className="font-mono text-xs text-gray-400 block text-center">Video Dili</label>
                                <select
                                    value={transcribeLanguage}
                                    onChange={(e) => setTranscribeLanguage(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 text-neon-green rounded-lg px-4 py-3 font-mono text-sm focus:border-neon-green outline-none"
                                >
                                    <option value="tr">🇹🇷 Türkçe</option>
                                    <option value="en">🇺🇸 English</option>
                                    <option value="de">🇩🇪 Deutsch</option>
                                    <option value="es">🇪🇸 Español</option>
                                    <option value="fr">🇫🇷 Français</option>
                                    <option value="auto">🌐 Otomatik Algıla</option>
                                </select>
                            </div>

                            <button
                                onClick={handleTranscribe}
                                disabled={isTranscribing}
                                className="btn-primary px-10 lg:px-12 py-4 lg:py-5 text-lg lg:text-xl flex items-center gap-3 shadow-[0_0_30px_rgba(74,222,128,0.3)] hover:shadow-[0_0_50px_rgba(74,222,128,0.5)] transition-all"
                            >
                                {isTranscribing ? (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="animate-spin text-2xl">⏳</span>
                                            <span>{secondsRemaining > 0 ? `${secondsRemaining}s` : 'PROCESSING'}</span>
                                        </div>
                                        <span className="text-xs font-mono text-neon-black/80 mt-1 animate-pulse">
                                            {loadingStatus || 'Başlatılıyor...'}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <span>🚀</span>
                                        <span>START MAGIC</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col h-full">
                            {/* Editor Tabs/Header */}
                            <div className="flex border-b border-gray-800">
                                <button
                                    onClick={() => setShowStylePanel(false)}
                                    className={`flex-1 py-3 text-sm font-mono transition-colors ${!showStylePanel ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    TIMELINE & TEXT
                                </button>
                                <button
                                    onClick={() => setShowStylePanel(true)}
                                    className={`flex-1 py-3 text-sm font-mono transition-colors ${showStylePanel ? 'text-neon-purple border-b-2 border-neon-purple bg-neon-purple/5' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    STYLE & ANIMATION
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                {/* Text Editor */}
                                <div className={`absolute inset-0 overflow-y-auto p-4 space-y-3 custom-scrollbar transition-opacity duration-300 ${!showStylePanel ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                    {segments.map((seg, idx) => {
                                        const isActive = videoTime >= seg.start && videoTime <= seg.end
                                        return (
                                            <div
                                                key={seg.id}
                                                className={`p-3 rounded border transition-all ${isActive
                                                    ? 'bg-neon-green/5 border-neon-green/50 shadow-lg shadow-neon-green/10'
                                                    : 'bg-black/40 border-gray-800 hover:border-gray-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div
                                                        className="flex items-center gap-2 font-mono text-xs text-neon-cyan cursor-pointer hover:underline bg-gray-900 px-2 py-1 rounded"
                                                        onClick={() => seekTo(seg.start)}
                                                    >
                                                        <span>⏱️</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={seg.start}
                                                            onChange={(e) => handleSegmentChange(idx, 'start', parseFloat(e.target.value))}
                                                            onBlur={commitChange}
                                                            className="bg-transparent w-12 text-center border-b border-gray-700 focus:border-neon-cyan outline-none"
                                                        />
                                                        <span className="text-gray-600">→</span>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={seg.end}
                                                            onChange={(e) => handleSegmentChange(idx, 'end', parseFloat(e.target.value))}
                                                            onBlur={commitChange}
                                                            className="bg-transparent w-12 text-center border-b border-gray-700 focus:border-neon-cyan outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex-1" />
                                                    <button
                                                        onClick={() => highlightWord(idx)}
                                                        className="text-neon-amber hover:text-neon-amber/80 text-xs px-2 py-1 hover:bg-gray-800 rounded"
                                                        title="Highlight Selected Word"
                                                    >
                                                        ✨ Highlight
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSegment(idx)}
                                                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 hover:bg-gray-800 rounded"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>

                                                <textarea
                                                    value={seg.text}
                                                    onChange={(e) => handleSegmentChange(idx, 'text', e.target.value)}
                                                    onBlur={commitChange}
                                                    className="w-full bg-transparent text-sm text-gray-200 focus:text-white outline-none resize-none font-sans leading-relaxed"
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

                                {/* Style Editor */}
                                <div className={`absolute inset-0 overflow-y-auto p-6 space-y-8 custom-scrollbar transition-opacity duration-300 ${showStylePanel ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>

                                    {/* PRESETS */}
                                    <div className="space-y-3">
                                        <div className="text-xs font-mono text-gray-500 tracking-widest">QUICK PRESETS</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {SUBTITLE_PRESETS.map(style => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => applyStylePreset(style)}
                                                    className={`p-3 rounded text-left transition-all border ${selectedPreset.id === style.id
                                                        ? 'bg-neon-green/10 border-neon-green text-neon-green'
                                                        : 'bg-gray-900 border-gray-800 hover:border-gray-600 text-gray-300'
                                                        }`}
                                                >
                                                    <div className="font-bold text-sm mb-1">{style.name}</div>
                                                    <div className="text-[10px] opacity-60 font-mono">{style.font}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* FONT & COLOR */}
                                    <div className="space-y-4">
                                        <div className="text-xs font-mono text-gray-500 tracking-widest">TYPOGRAPHY</div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">Font Family</label>
                                            <select
                                                value={customFont}
                                                onChange={(e) => setCustomFont(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-neon-purple outline-none"
                                            >
                                                {ALL_FONTS.map(font => (
                                                    <option key={font} value={font}>{font}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">Primary Color</label>
                                            <div className="flex gap-2 flex-wrap">
                                                {COLOR_PRESETS.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setCustomColor(color)}
                                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${customColor === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-gray-700'
                                                            }`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                                <input
                                                    type="color"
                                                    value={customColor}
                                                    onChange={(e) => setCustomColor(e.target.value)}
                                                    className="w-8 h-8 rounded-full cursor-pointer overflow-hidden border-none p-0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-800 my-4"></div>

                                    {/* BACKGROUND & ANIMATION */}
                                    <div className="space-y-4">
                                        <div className="text-xs font-mono text-gray-500 tracking-widest">EFFECTS</div>

                                        {/* Background Toggle */}
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs text-gray-400">Background Box</label>
                                            <button
                                                onClick={() => setBgEnabled(!bgEnabled)}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${bgEnabled ? 'bg-neon-green' : 'bg-gray-700'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${bgEnabled ? 'left-6' : 'left-1'}`} />
                                            </button>
                                        </div>

                                        {bgEnabled && (
                                            <div className="space-y-3 p-3 bg-gray-900 rounded border border-gray-800 animate-fade-in">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Opacity</span>
                                                    <span className="text-neon-cyan">{Math.round(bgOpacity * 100)}%</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.1"
                                                    value={bgOpacity} onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                                                    className="w-full range-retro h-1"
                                                />

                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Radius</span>
                                                    <span className="text-neon-cyan">{bgRadius}px</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="30" step="2"
                                                    value={bgRadius} onChange={(e) => setBgRadius(parseInt(e.target.value))}
                                                    className="w-full range-retro h-1"
                                                />
                                            </div>
                                        )}

                                        {/* Animation Speed */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-gray-400">Animation Speed</span>
                                                <span className="text-neon-amber">{animationSpeed}x</span>
                                            </div>
                                            <input
                                                type="range" min="0.5" max="2.0" step="0.1"
                                                value={animationSpeed} onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                                                className="w-full range-retro"
                                            />
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-800 my-4"></div>

                                    {/* POSITION & ANIMATION */}
                                    <div className="space-y-4">
                                        <div className="text-xs font-mono text-gray-500 tracking-widest">LAYOUT & EFFECTS</div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">Position</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {POSITIONS.map(pos => (
                                                    <button
                                                        key={pos.id}
                                                        onClick={() => setPosition(pos.id)}
                                                        className={`py-2 rounded text-xs font-mono transition-colors border ${position === pos.id
                                                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan'
                                                            : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                                                            }`}
                                                    >
                                                        {pos.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400">Entrance Animation</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {ANIMATIONS.map(anim => (
                                                    <button
                                                        key={anim.id}
                                                        onClick={() => setAnimation(anim.id)}
                                                        className={`py-2 px-3 rounded text-xs font-mono transition-colors text-left border ${animation === anim.id
                                                            ? 'bg-neon-amber/20 border-neon-amber text-neon-amber'
                                                            : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                                                            }`}
                                                    >
                                                        <span className="mr-2">{anim.icon}</span>
                                                        {anim.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Status */}
                            <div className="p-3 bg-black border-t border-gray-800 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                <div>{segments.length} {t('editor.segmentCount')}</div>
                                <div>{t('editor.autoSave')}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* TIMELINE (Only in Edit Mode) */}
            {
                currentStep === 'edit' && videoRef.current && (
                    <div className="h-48 bg-[#0a0a0a] border-t border-gray-800 flex flex-col relative group select-none">
                        {/* Time Indicators */}
                        <div className="h-6 flex items-center px-4 border-b border-gray-800 text-[10px] fon-mono text-gray-500">
                            {formatTime(0)}
                            <span className="mx-auto">{t('editor.timeline')}</span>
                            {formatTime(videoRef.current.duration || 0)}
                        </div>

                        {/* Waveform & Segments Container */}
                        <div className="flex-1 relative overflow-hidden bg-[#050505]">
                            {/* Waveform Canvas */}
                            <canvas
                                ref={canvasRef}
                                className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
                                width={1000}
                                height={150}
                            />

                            {/* Playhead */}
                            {videoRef.current.duration > 0 && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-neon-red z-20 pointer-events-none shadow-[0_0_10px_red]"
                                    style={{ left: `${(videoTime / videoRef.current.duration) * 100}%` }}
                                >
                                    <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-neon-red transform rotate-45" />
                                </div>
                            )}

                            {/* Segments Layer */}
                            <div className="absolute inset-0 flex items-center px-2">
                                {segments.map((seg, idx) => {
                                    if (!videoRef.current?.duration) return null
                                    const duration = videoRef.current.duration
                                    const left = (seg.start / duration) * 100
                                    const width = ((seg.end - seg.start) / duration) * 100
                                    const isActive = videoTime >= seg.start && videoTime <= seg.end

                                    return (
                                        <div
                                            key={seg.id}
                                            className={`absolute h-20 rounded cursor-pointer border overflow-hidden transition-all group/seg
                                            ${isActive ? 'border-neon-green z-10 bg-neon-green/20' : 'border-gray-600 bg-gray-800/50 hover:border-gray-400'}
                                        `}
                                            style={{ left: `${left}%`, width: `${width}%`, top: '10%' }}
                                            onClick={() => {
                                                if (videoRef.current) {
                                                    videoRef.current.currentTime = seg.start
                                                    setVideoTime(seg.start)
                                                }
                                            }}
                                        >
                                            <div className="px-1 py-0.5 text-[8px] truncate text-white/70 font-mono select-none">
                                                {seg.text}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Keyboard Help Modal */}
            <AnimatePresence>
                {showKeyboardHelp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowKeyboardHelp(false)}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent">{t('help.keyboardShortcuts')}</h3>
                                <button onClick={() => setShowKeyboardHelp(false)} className="text-gray-500 hover:text-white">✕</button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <span className="text-gray-400">{t('help.playPause')}</span>
                                    <code className="bg-gray-800 px-2 py-1 rounded text-xs text-neon-green">SPACE</code>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <span className="text-gray-400">{t('help.undo')}</span>
                                    <code className="bg-gray-800 px-2 py-1 rounded text-xs text-neon-green">Ctrl + Z</code>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <span className="text-gray-400">{t('help.redo')}</span>
                                    <code className="bg-gray-800 px-2 py-1 rounded text-xs text-neon-green">Ctrl + Shift + Z</code>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <span className="text-gray-400">{t('help.save')}</span>
                                    <code className="bg-gray-800 px-2 py-1 rounded text-xs text-neon-green">Ctrl + S</code>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <span className="text-gray-400">{t('help.split')}</span>
                                    <code className="bg-gray-800 px-2 py-1 rounded text-xs text-neon-green">S</code>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">{t('help.merge')}</span>
                                    <code className="bg-gray-800 px-2 py-1 rounded text-xs text-neon-green">M</code>
                                </div>
                            </div>

                            <div className="mt-6 text-center text-xs text-gray-500">
                                Press <span className="text-white">?</span> to toggle this menu
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main >
    )
}

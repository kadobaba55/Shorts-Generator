'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

// Re-using the ProcessedClip interface, but extended for the Studio
export interface EditorClip {
    id: string
    videoPath: string // The source video (subtitled or clean)
    originalUrl?: string // Always the clean original
    subtitledPath?: string // If a burnt version exists
    start: number // Start time in the timeline (global timeline)
    duration: number // Playback duration
    trimStart: number // Start trimming from source
    trimEnd: number // End trimming from source

    // Subtitle Data
    hasSubtitles: boolean
    subtitleSegments: any[] // We can type this strictly later
    subtitleStyle?: any

    // Visual Properties
    volume: number
    opacity: number
    scale: number
    position: { x: number; y: number }
}

interface EditorContextType {
    // Project State
    clips: EditorClip[]
    setClips: React.Dispatch<React.SetStateAction<EditorClip[]>>
    updateClip: (id: string, updates: Partial<EditorClip>) => void

    // Transport Control
    currentTime: number
    setCurrentTime: (time: number) => void
    duration: number // Total project duration
    isPlaying: boolean
    setIsPlaying: (playing: boolean) => void
    togglePlay: () => void
    seekTo: (time: number) => void

    // Selection
    selectedClipId: string | null
    setSelectedClipId: (id: string | null) => void

    // Subtitle Actions
    updateSubtitleSegment: (clipId: string, segmentIndex: number, updates: any) => void
    addSubtitleSegment: (clipId: string, start: number) => void
    removeSubtitleSegment: (clipId: string, segmentIndex: number) => void
    updateSubtitleStyle: (clipId: string, style: any) => void

    // Refs
    videoRef: React.RefObject<HTMLVideoElement>
}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

export function EditorProvider({ children }: { children: React.ReactNode }) {
    const [clips, setClips] = useState<EditorClip[]>([])
    const [currentTime, setCurrentTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Derived state: Total duration is the end of the last clip
    const duration = clips.reduce((max, clip) => Math.max(max, clip.start + clip.duration), 0) || 30

    const updateClip = useCallback((id: string, updates: Partial<EditorClip>) => {
        setClips(prev => prev.map(clip =>
            clip.id === id ? { ...clip, ...updates } : clip
        ))
    }, [])

    const updateSubtitleSegment = useCallback((clipId: string, segmentIndex: number, updates: any) => {
        setClips(prev => prev.map(clip => {
            if (clip.id !== clipId || !clip.subtitleSegments) return clip
            const newSegments = [...clip.subtitleSegments]
            newSegments[segmentIndex] = { ...newSegments[segmentIndex], ...updates }
            return { ...clip, subtitleSegments: newSegments }
        }))
    }, [])

    const addSubtitleSegment = useCallback((clipId: string, start: number) => {
        setClips(prev => prev.map(clip => {
            if (clip.id !== clipId) return clip
            const newSegment = {
                id: Date.now().toString(),
                start: start,
                end: start + 2.0,
                text: 'New Subtitle'
            }
            // Insert sorted? For now just append and user can sort or we sort render
            const segments = [...(clip.subtitleSegments || []), newSegment].sort((a, b) => a.start - b.start)
            return { ...clip, subtitleSegments: segments, hasSubtitles: true }
        }))
    }, [])

    const removeSubtitleSegment = useCallback((clipId: string, segmentIndex: number) => {
        setClips(prev => prev.map(clip => {
            if (clip.id !== clipId || !clip.subtitleSegments) return clip
            const newSegments = clip.subtitleSegments.filter((_, i) => i !== segmentIndex)
            return { ...clip, subtitleSegments: newSegments, hasSubtitles: newSegments.length > 0 }
        }))
    }, [])

    const updateSubtitleStyle = useCallback((clipId: string, style: any) => {
        setClips(prev => prev.map(clip =>
            clip.id === clipId ? { ...clip, subtitleStyle: { ...(clip.subtitleStyle || {}), ...style } } : clip
        ))
    }, [])

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause()
            } else {
                videoRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }, [isPlaying])

    const seekTo = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time // Note: This might need adjustment for multi-clip
            // In a global timeline, "time" is global. 
            // Ideally we need a logic to switch video src based on global time, 
            // but for simpler implementation where we edit ONE selected clip or sequence,
            // we often load the active clip into the player. 
            // Let's assume for this "Studio" v1, we focus on the SELECTED clip or Sequential playback.
            // For true sequential playback without concatenation, we need complex logic.
            // Let's stick to the current logic: The timeline mainly controls the CURRENT ACTIVE clip or a concatenated preview.

            // Actually, for "After Effects" style, we usually want to see the whole sequence.
            // But simpler approach: The player plays the "Selected Clip" relative to its own time?
            // No, "Timeline" implies sequence. 

            // **Simplification for MVP**: The Player shows the SELECTED clip. 
            // The Timeline shows ALL clips. 
            // If we want to play the whole sequence, we need to swap `src` dynamically.

            // Let's implement basic seek for now, updating state.
            setCurrentTime(time)
        }
    }, [])

    // Sync specific logic can go here (like RequestAnimationFrame loop for smoother time tracking)
    useEffect(() => {
        let frameId: number
        const loop = () => {
            if (isPlaying && videoRef.current) {
                // If we are playing a single clip, specific time mapping logic is needed
                // For MVP, let's trust the video element's time for the single clip view
                // Or if we are in "Project Mode", we handle time manually.

                // Let's keep it simple: We rely on the <VideoPlayer> component to call setCurrentTime
            }
            frameId = requestAnimationFrame(loop)
        }
        if (isPlaying) loop()
        return () => cancelAnimationFrame(frameId)
    }, [isPlaying])


    return (
        <EditorContext.Provider value={{
            clips,
            setClips,
            updateClip,
            currentTime,
            setCurrentTime,
            duration,
            isPlaying,
            setIsPlaying,
            togglePlay,
            seekTo,
            selectedClipId,
            setSelectedClipId,
            videoRef,
            updateSubtitleSegment,
            addSubtitleSegment,
            removeSubtitleSegment,
            updateSubtitleStyle
        }}>
            {children}
        </EditorContext.Provider>
    )
}

export function useEditor() {
    const context = useContext(EditorContext)
    if (context === undefined) {
        throw new Error('useEditor must be used within an EditorProvider')
    }
    return context
}

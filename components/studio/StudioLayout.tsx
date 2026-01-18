'use client'

import React, { useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEditor } from './EditorContext'
import { motion } from 'framer-motion'

// --- Sub-Components ---

const Sidebar = () => {
    const { clips, selectedClipId, setSelectedClipId } = useEditor()
    const selectedClip = clips.find(c => c.id === selectedClipId)

    const router = useRouter()
    const pathname = usePathname()

    const handleEditSubtitle = () => {
        if (selectedClip) {
            // Navigate to existing subtitle page
            // Path structure: /editor/[videoId]/subtitle/[clipId]
            // We are at /editor/[videoId]
            router.push(`${pathname}/subtitle/${selectedClip.id}`)
        }
    }

    return (
        <div className="h-full border-r border-neon-green/30 bg-bg-card flex flex-col font-mono">
            {/* Folder View */}
            <div className="p-3 border-b border-neon-green/30 bg-bg-terminal/50">
                <h3 className="text-[10px] text-neon-amber mb-2 tracking-widest">&gt; PROJECT FILES</h3>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                    {clips.map((clip, index) => (
                        <button
                            key={clip.id}
                            onClick={() => setSelectedClipId(clip.id)}
                            className={`flex items-center gap-2 p-2 rounded text-left transition-all group ${selectedClipId === clip.id
                                ? 'bg-neon-green/10 text-neon-green border border-neon-green/50'
                                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                }`}
                        >
                            <span className="text-[10px] opacity-50">{String(index + 1).padStart(2, '0')}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs truncate">CLIP_{index + 1}</div>
                                <div className="text-[10px] opacity-60">{clip.duration.toFixed(1)}s</div>
                            </div>
                            {clip.hasSubtitles && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse"></span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Properties Panel */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] text-neon-cyan mb-3 tracking-widest">&gt; PROPERTIES</h3>
                {selectedClip ? (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500">ID / SOURCE</label>
                            <div className="text-xs text-neon-green break-all">{selectedClip.id}</div>
                            <div className="text-[10px] text-gray-600 truncate">{selectedClip.videoPath}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-500">DURATION</label>
                            <div className="text-xs text-white">{selectedClip.duration.toFixed(2)}s</div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-800">
                            <div className="text-[10px] text-neon-magenta">&gt; TRANSFORM</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-600">SCALE</label>
                                    <input type="number" className="w-full bg-black border border-gray-700 rounded px-1 py-0.5 text-xs text-right" defaultValue={100} />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-600">OPACITY</label>
                                    <input type="number" className="w-full bg-black border border-gray-700 rounded px-1 py-0.5 text-xs text-right" defaultValue={100} />
                                </div>
                            </div>
                        </div>

                        {selectedClip.hasSubtitles && (
                            <div className="space-y-2 pt-2 border-t border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] text-neon-amber">&gt; SUBTITLES</div>
                                    <button
                                        onClick={handleEditSubtitle}
                                        className="text-[10px] bg-neon-amber/10 text-neon-amber px-2 py-0.5 rounded border border-neon-amber/30 hover:bg-neon-amber/20"
                                    >
                                        EDIT
                                    </button>
                                </div>
                                <div className="p-2 bg-black/40 rounded border border-gray-800 text-[10px] text-gray-400">
                                    {selectedClip.subtitleSegments?.length || 0} segments
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-[10px] text-gray-600 italic">
                        SELECT A CLIP
                    </div>
                )}
            </div>
        </div>
    )
}

const VideoPreview = () => {
    const { selectedClipId, clips, videoRef, isPlaying, togglePlay } = useEditor()
    const selectedClip = clips.find(c => c.id === selectedClipId)

    return (
        <div className="h-full flex items-center justify-center bg-black/90 relative overflow-hidden group">
            {/* Grid Background */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            {selectedClip ? (
                <div className="relative h-full max-h-[80vh] aspect-[9/16] shadow-2xl bg-black border border-gray-800 transition-all duration-300">
                    <video
                        ref={videoRef}
                        key={selectedClip.videoPath} // Reload on change
                        src={selectedClip.videoPath}
                        className="w-full h-full object-contain"
                        onClick={togglePlay}
                        playsInline
                    />

                    {/* Play Button Overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 rounded-full border-2 border-neon-green flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                <span className="text-neon-green text-3xl ml-1">▶</span>
                            </div>
                        </div>
                    )}

                    {/* Safe Area Guides (Optional) */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity">
                        <div className="absolute top-[10%] bottom-[10%] left-[10%] right-[10%] border border-dashed border-red-500"></div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-gray-600">
                    <div className="text-4xl">🎬</div>
                    <div className="font-mono text-xs">NO CLIP SELECTED</div>
                </div>
            )}
        </div>
    )
}

const Timeline = () => {
    const { currentTime, duration, clips, selectedClipId, setSelectedClipId } = useEditor()

    // Simple mock scale
    const pixelsPerSecond = 5 // Zoom level

    return (
        <div className="h-full border-t-2 border-neon-green/30 bg-bg-card flex flex-col font-mono select-none">
            {/* Toolbar */}
            <div className="h-8 border-b border-gray-800 flex items-center px-4 justify-between bg-bg-terminal/80">
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-neon-green">{currentTime.toFixed(2)}s</span>
                    <span className="text-gray-600">/</span>
                    <span className="text-gray-400">{duration.toFixed(2)}s</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-[10px] text-gray-500 hover:text-white px-2">ZOOM -</button>
                    <button className="text-[10px] text-gray-500 hover:text-white px-2">ZOOM +</button>
                </div>
            </div>

            {/* Timeline Tracks Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#111]">

                {/* Time Ruler */}
                <div className="relative h-6 border-b border-gray-800 bg-[#1a1a1a]">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="absolute bottom-0 text-[8px] text-gray-500 pl-1 border-l border-gray-700 h-3" style={{ left: `${i * 10}%` }}>
                            {(i * (duration / 20)).toFixed(0)}s
                        </div>
                    ))}
                </div>

                {/* Tracks Container */}
                <div className="p-4 space-y-2 min-w-full" style={{ width: `${duration * pixelsPerSecond + 200}px` }}>

                    {/* Video Track */}
                    <div className="relative h-12 bg-gray-900/50 rounded border border-gray-800 flex items-center">
                        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-800 border-r border-gray-700 flex items-center justify-center z-10">
                            <span className="text-[9px] text-blue-400">VIDEO</span>
                        </div>
                        <div className="ml-24 flex-1 relative h-full">
                            {clips.map(clip => (
                                <div
                                    key={clip.id}
                                    onClick={() => setSelectedClipId(clip.id)}
                                    className={`absolute top-1 bottom-1 rounded cursor-pointer overflow-hidden border transition-colors flex items-center px-2 group
                                        ${selectedClipId === clip.id ? 'bg-blue-900/40 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}
                                    `}
                                    style={{
                                        left: `${clip.start * 2}%`, // Simplified positioning for now
                                        width: `${(clip.duration / duration) * 80}%` // Simplified width
                                    }}
                                >
                                    <div className="text-[9px] text-blue-300 truncate font-bold">CLIP_{clip.id.split('_')[1]}</div>
                                    {/* Trim handles */}
                                    {selectedClipId === clip.id && (
                                        <>
                                            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500/50 hover:bg-blue-400"></div>
                                            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-500/50 hover:bg-blue-400"></div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Subtitle Track */}
                    <div className="relative h-12 bg-gray-900/50 rounded border border-gray-800 flex items-center">
                        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gray-800 border-r border-gray-700 flex items-center justify-center z-10">
                            <span className="text-[9px] text-amber-400">TEXT</span>
                        </div>
                        <div className="ml-24 flex-1 relative h-full">
                            {/* Render subtitle blocks here if needed */}
                        </div>
                    </div>

                </div>

                {/* Playhead Line */}
                {/* Note: This logic needs to sync with scrolling, simplified here */}
                {/* <div className="absolute top-0 bottom-0 w-0.5 bg-neon-red z-30 pointer-events-none" style={{ left: '30%' }}></div> */}
            </div>
        </div>
    )
}

// --- Main Layout ---

export default function StudioLayout() {
    const { data: session } = useSession()

    return (
        <div className="flex flex-col h-screen bg-bg-terminal text-white overflow-hidden">
            {/* Header */}
            <header className="h-10 border-b border-neon-green/30 bg-bg-card flex items-center px-4 justify-between shrink-0 z-40 relative">
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-neon-green to-neon-cyan animate-pulse"></div>
                    <span className="font-mono text-xs text-neon-green font-bold tracking-widest">KADOSTUDIO <span className="text-gray-600">//</span> v2.0</span>
                </div>

                <div className="flex items-center gap-4">
                    <button className="text-[10px] font-mono text-neon-cyan border border-neon-cyan/50 px-2 py-0.5 rounded hover:bg-neon-cyan/10">
                        RENDER QUEUE
                    </button>
                    <Link href="/" className="text-[10px] font-mono text-red-400 hover:text-red-300">
                        [EXIT STUDIO]
                    </Link>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Left Panel */}
                <div className="w-64 shrink-0 hidden md:block z-30 relative bg-bg-terminal">
                    <Sidebar />
                </div>

                {/* Center & Bottom */}
                <div className="flex-1 flex flex-col min-w-0 bg-black">
                    {/* Viewport */}
                    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                        <VideoPreview />
                    </div>

                    {/* Bottom Panel */}
                    <div className="h-64 shrink-0 z-30 relative">
                        <Timeline />
                    </div>
                </div>
            </div>
        </div>
    )
}

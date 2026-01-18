'use client'

import React, { useState } from 'react'
import { useEditor } from './EditorContext'
import { SUBTITLE_PRESETS, ALL_FONTS, SubtitlePreset } from '@/lib/subtitlePresets' // Assuming this path exists based on prev analysis

export default function SubtitleInspector() {
    const {
        clips,
        selectedClipId,
        currentTime,
        seekTo,
        updateSubtitleSegment,
        addSubtitleSegment,
        removeSubtitleSegment,
        updateSubtitleStyle
    } = useEditor()

    const selectedClip = clips.find(c => c.id === selectedClipId)
    const [activeTab, setActiveTab] = useState<'text' | 'style'>('text')

    // Local state for style inputs to avoid continuous re-renders/commits?
    // For now, directe update is fine if context isn't too slow.

    if (!selectedClip || !selectedClip.hasSubtitles) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 font-mono text-xs p-4 text-center">
                <span className="text-2xl mb-2">📝</span>
                Select a clip with subtitles to edit properties.
                {!selectedClip && <div className="mt-2 text-[10px] text-gray-600">No clip selected.</div>}
                {selectedClip && !selectedClip.hasSubtitles && (
                    <button
                        onClick={() => addSubtitleSegment(selectedClip.id, currentTime)}
                        className="mt-4 px-4 py-2 bg-neon-green/20 text-neon-green border border-neon-green/50 rounded hover:bg-neon-green/30"
                    >
                        Example Subtitle
                    </button>
                    // Note: Real "Add Subtitles" usually involves transcription or empty track initialization
                )}
            </div>
        )
    }

    const segments = selectedClip.subtitleSegments || []
    const currentStyle = selectedClip.subtitleStyle || SUBTITLE_PRESETS[0]

    return (
        <div className="flex flex-col h-full bg-bg-card font-mono text-xs">
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button
                    onClick={() => setActiveTab('text')}
                    className={`flex-1 py-3 transition-colors ${activeTab === 'text' ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    TEXT
                </button>
                <button
                    onClick={() => setActiveTab('style')}
                    className={`flex-1 py-3 transition-colors ${activeTab === 'style' ? 'text-neon-purple border-b-2 border-neon-purple bg-neon-purple/5' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    STYLE
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {activeTab === 'text' && (
                    <div className="space-y-0 divide-y divide-gray-800">
                        {segments.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No segments.
                                <button
                                    onClick={() => addSubtitleSegment(selectedClip.id, currentTime)}
                                    className="block mx-auto mt-2 text-neon-green hover:underline"
                                >
                                    + Add at Playhead
                                </button>
                            </div>
                        )}

                        {segments.map((seg: any, idx: number) => {
                            const isActive = currentTime >= seg.start && currentTime <= seg.end
                            return (
                                <div
                                    key={seg.id || idx}
                                    className={`p-3 transition-colors ${isActive ? 'bg-neon-green/5' : 'hover:bg-gray-900'}`}
                                >
                                    <div className="flex items-center gap-2 mb-2 text-[10px] text-gray-500">
                                        <div
                                            className="cursor-pointer hover:text-neon-cyan"
                                            onClick={() => seekTo(seg.start)}
                                        >
                                            {seg.start.toFixed(1)}s
                                        </div>
                                        <span>→</span>
                                        <div
                                            className="cursor-pointer hover:text-neon-cyan"
                                            onClick={() => seekTo(seg.end)}
                                        >
                                            {seg.end.toFixed(1)}s
                                        </div>
                                        <div className="flex-1"></div>
                                        <button
                                            onClick={() => removeSubtitleSegment(selectedClip.id, idx)}
                                            className="text-red-900 hover:text-red-500 px-1" title="Delete"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <textarea
                                        value={seg.text}
                                        onChange={(e) => updateSubtitleSegment(selectedClip.id, idx, { text: e.target.value })}
                                        className="w-full bg-black/30 border border-gray-800 rounded p-2 text-white text-xs focus:border-neon-cyan outline-none resize-none"
                                        rows={2}
                                    />
                                </div>
                            )
                        })}

                        <div className="p-4">
                            <button
                                onClick={() => addSubtitleSegment(selectedClip.id, currentTime)}
                                className="w-full py-2 border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 rounded"
                            >
                                + Add Segment
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'style' && (
                    <div className="p-4 space-y-6">
                        {/* Presets */}
                        <div>
                            <label className="block text-[10px] text-gray-500 mb-2 font-bold tracking-widest">PRESETS</label>
                            <div className="grid grid-cols-2 gap-2">
                                {SUBTITLE_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => updateSubtitleStyle(selectedClip.id, preset)}
                                        className={`p-2 text-left rounded border text-[10px] truncate ${currentStyle.id === preset.id
                                                ? 'border-neon-purple bg-neon-purple/20 text-white'
                                                : 'border-gray-800 bg-black hover:border-gray-600 text-gray-400'
                                            }`}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Font Settings */}
                        <div className="space-y-3 pt-4 border-t border-gray-800">
                            <label className="block text-[10px] text-gray-500 font-bold tracking-widest">TYPOGRAPHY</label>

                            <div>
                                <div className="text-[10px] text-gray-600 mb-1">FONT FAMILY</div>
                                <select
                                    value={currentStyle.font}
                                    onChange={(e) => updateSubtitleStyle(selectedClip.id, { font: e.target.value })}
                                    className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:border-neon-purple"
                                >
                                    {ALL_FONTS.map(font => (
                                        <option key={font} value={font}>{font}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <div className="text-[10px] text-gray-600 mb-1">COLOR</div>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={currentStyle.primaryColor}
                                            onChange={(e) => updateSubtitleStyle(selectedClip.id, { primaryColor: e.target.value })}
                                            className="w-6 h-6 bg-transparent border-0 p-0 cursor-pointer"
                                        />
                                        <span className="text-[10px] text-gray-400">{currentStyle.primaryColor}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] text-gray-600 mb-1">SIZE</div>
                                    <input
                                        type="number"
                                        value={currentStyle.fontSize || 24}
                                        onChange={(e) => updateSubtitleStyle(selectedClip.id, { fontSize: parseInt(e.target.value) })}
                                        className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-xs outline-none focus:border-neon-purple text-right"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Animation */}
                        <div className="space-y-3 pt-4 border-t border-gray-800">
                            <label className="block text-[10px] text-gray-500 font-bold tracking-widest">ANIMATION</label>
                            <div className="flex flex-wrap gap-2">
                                {['none', 'pop', 'fade', 'slide', 'bounce', 'typewriter'].map(anim => (
                                    <button
                                        key={anim}
                                        onClick={() => updateSubtitleStyle(selectedClip.id, { animation: anim })}
                                        className={`px-3 py-1 rounded text-[10px] border ${(currentStyle.animation || 'none') === anim
                                                ? 'border-neon-cyan bg-neon-cyan/20 text-white'
                                                : 'border-gray-800 bg-black text-gray-500 hover:border-gray-600'
                                            }`}
                                    >
                                        {anim.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    )
}

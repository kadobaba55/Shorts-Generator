'use client'

import { useState } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

interface ConfigStepProps {
    videoInfo: { title: string; duration: number } | null
    language: string
    setLanguage: (lang: string) => void
    whisperModel: 'tiny' | 'base' | 'small' | 'medium'
    setWhisperModel: (model: 'tiny' | 'base' | 'small' | 'medium') => void
    mode: 'auto' | 'manual'
    setMode: (mode: 'auto' | 'manual') => void
    clipCount: number
    setClipCount: (count: number) => void
    clipDuration: number
    setClipDuration: (duration: number) => void
    manualClips: { start: number; end: number; id: string }[]
    setManualClips: (clips: { start: number; end: number; id: string }[]) => void
    onSubmit: () => void
    onBack: () => void
    isAnalyzing: boolean
    estimatedTimeRemaining?: string
    statusMessage?: string
}

export default function ConfigStep({
    videoInfo,
    language,
    setLanguage,
    whisperModel,
    setWhisperModel,
    mode,
    setMode,
    clipCount,
    setClipCount,
    clipDuration,
    setClipDuration,
    manualClips,
    setManualClips,
    onSubmit,
    onBack,
    isAnalyzing,
    estimatedTimeRemaining,
    statusMessage
}: ConfigStepProps) {
    const { t } = useLanguage()

    // Manual clip input state
    const [startStr, setStartStr] = useState('00:00')
    const [endStr, setEndStr] = useState('00:30')

    const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':')
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseInt(parts[1])
        }
        return 0
    }

    const formatTime = (seconds: number): string => {
        const m = Math.floor(seconds / 60)
        const s = Math.floor(seconds % 60)
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const addManualClip = () => {
        const start = parseTime(startStr)
        const end = parseTime(endStr)

        if (end <= start) {
            alert('Bitiş süresi başlangıçtan büyük olmalı!')
            return
        }

        if (videoInfo && end > videoInfo.duration) {
            alert('Video süresini aştınız!')
            return
        }

        const newClip = {
            id: Date.now().toString(),
            start,
            end
        }

        setManualClips([...manualClips, newClip])
        // Reset inputs intelligently
        setStartStr(endStr)
        setEndStr(formatTime(Math.min(end + 30, videoInfo?.duration || end + 30)))
    }

    const removeManualClip = (id: string) => {
        setManualClips(manualClips.filter(c => c.id !== id))
    }

    return (
        <div className="max-w-2xl mx-auto py-4 md:py-8 px-2 md:px-4 animate-slide-up">
            {/* Terminal Window */}
            <div className="border-2 border-neon-green bg-bg-terminal">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 border-b-2 border-neon-green/30 bg-bg-card">
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-red"></span>
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-amber"></span>
                    <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-green"></span>
                    <span className="font-mono text-xs md:text-sm text-neon-green ml-2">
                        terminal://config
                    </span>
                    <button
                        onClick={onBack}
                        className="ml-auto font-mono text-[10px] md:text-xs text-neon-amber hover:text-neon-green transition-colors"
                    >
                        [← {t('editor.back')}]
                    </button>
                </div>

                {/* Terminal Content */}
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                    {/* Video Info */}
                    {videoInfo && (
                        <div className="border border-neon-green/30 p-3 md:p-4 bg-bg-card">
                            <div className="font-mono text-xs text-neon-amber mb-1 md:mb-2">&gt; {t('config.loaded')}:</div>
                            <div className="font-mono text-xs md:text-sm text-neon-green truncate">
                                {videoInfo.title}
                            </div>
                            <div className="font-mono text-[10px] md:text-xs text-gray-500 mt-1">
                                {t('config.duration')}: {formatTime(videoInfo.duration)}
                            </div>
                        </div>
                    )}



                    {/* Mode Toggle with Sliding UI */}
                    <div className="border border-neon-cyan/30 p-3 md:p-4 bg-bg-card space-y-3">
                        <div className="font-mono text-xs md:text-sm text-neon-cyan mb-2">
                            [⚙️] MODE_SELECTION
                        </div>

                        <div className="relative w-full h-12 bg-gray-900 border border-gray-700 rounded-lg p-1 cursor-pointer" onClick={() => setMode(mode === 'auto' ? 'manual' : 'auto')}>
                            {/* Background Labels */}
                            <div className="absolute inset-0 flex items-center justify-between px-8 text-xs font-mono font-bold text-gray-600 pointer-events-none">
                                <span>AI AUTO</span>
                                <span>MANUAL</span>
                            </div>

                            {/* Sliding Handle */}
                            <div
                                className={`
                                    absolute top-1 bottom-1 w-1/2 rounded-md flex items-center justify-center
                                    transition-all duration-300 ease-out shadow-lg border
                                    ${mode === 'auto'
                                        ? 'left-1 bg-neon-green/20 border-neon-green text-neon-green'
                                        : 'left-[calc(50%-4px)] translate-x-[4px] bg-neon-amber/20 border-neon-amber text-neon-amber'
                                    }
                                `}
                                style={{
                                    left: mode === 'auto' ? '4px' : '50%'
                                }}
                            >
                                <span className="font-mono font-bold tracking-wider">
                                    {mode === 'auto' ? '🤖 AI MAGIC' : '✂️ MANUAL'}
                                </span>
                            </div>
                        </div>

                        <div className="font-mono text-[10px] md:text-xs text-gray-500 mt-1 text-center">
                            {mode === 'auto' ? '// Auto-detect viral moments' : '// Manually select clip ranges'}
                        </div>
                    </div>

                    {/* Manual Mode Tip - Only show when AI mode is selected */}
                    {mode === 'auto' && (
                        <div className="border border-neon-amber/30 bg-neon-amber/5 p-3 rounded animate-fade-in">
                            <div className="flex items-start gap-2">
                                <span className="text-neon-amber">💡</span>
                                <div className="flex-1">
                                    <p className="font-mono text-xs text-neon-amber/90">
                                        Hızlı işlem için{' '}
                                        <button
                                            onClick={() => setMode('manual')}
                                            className="underline hover:text-neon-green transition-colors font-bold"
                                        >
                                            Manuel Mod
                                        </button>
                                        'u kullanabilirsiniz.
                                    </p>
                                    <p className="font-mono text-[10px] text-gray-500 mt-1">
                                        AI analizi bazı videolarda uzun sürebilir.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {mode === 'auto' && (
                        <div className="border border-neon-green/30 p-3 md:p-4 bg-bg-card space-y-4 animate-fade-in">
                            <div className="font-mono text-xs text-neon-green mb-2">
                                &gt; AI_PARAMETERS:
                            </div>

                            {/* Clip Count */}
                            <div className="space-y-2">
                                <div className="flex justify-between font-mono text-xs md:text-sm">
                                    <span className="text-gray-400">{t('config.clipCount')}:</span>
                                    <span className="text-neon-green">[{clipCount}]</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={clipCount}
                                    onChange={(e) => setClipCount(parseInt(e.target.value))}
                                    className="w-full range-retro"
                                />
                                <div className="flex justify-between font-mono text-[10px] text-gray-600">
                                    <span>1</span>
                                    <span>10</span>
                                </div>
                            </div>

                            {/* Clip Duration */}
                            <div className="space-y-2">
                                <div className="flex justify-between font-mono text-xs md:text-sm">
                                    <span className="text-gray-400">{t('config.clipDuration')}:</span>
                                    <span className="text-neon-green">[{clipDuration}s]</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="60"
                                    step="5"
                                    value={clipDuration}
                                    onChange={(e) => setClipDuration(parseInt(e.target.value))}
                                    className="w-full range-retro"
                                />
                                <div className="flex justify-between font-mono text-[10px] text-gray-600">
                                    <span>10s</span>
                                    <span>60s</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Manual Mode Settings */}
                    {mode === 'manual' && (
                        <div className="border border-neon-amber/30 p-3 md:p-4 bg-bg-card space-y-4 animate-fade-in">
                            <div className="font-mono text-xs text-neon-amber mb-2">
                                &gt; MANUAL_TIMELINE:
                            </div>

                            <div className="flex items-end gap-2">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-gray-400 font-mono">Start (MM:SS)</label>
                                    <input
                                        type="text"
                                        value={startStr}
                                        onChange={(e) => setStartStr(e.target.value)}
                                        className="w-full bg-black/50 border border-gray-600 rounded px-2 py-1 text-neon-green font-mono text-sm focus:border-neon-green outline-none"
                                        placeholder="00:00"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-gray-400 font-mono">End (MM:SS)</label>
                                    <input
                                        type="text"
                                        value={endStr}
                                        onChange={(e) => setEndStr(e.target.value)}
                                        className="w-full bg-black/50 border border-gray-600 rounded px-2 py-1 text-neon-red font-mono text-sm focus:border-neon-red outline-none"
                                        placeholder="00:30"
                                    />
                                </div>
                                <button
                                    onClick={addManualClip}
                                    className="h-9 px-4 bg-neon-amber/20 border border-neon-amber text-neon-amber text-xs font-bold hover:bg-neon-amber hover:text-black transition-all rounded"
                                >
                                    + ADD
                                </button>
                            </div>

                            {/* Added Clips List */}
                            <div className="space-y-2 mt-4">
                                {manualClips.length === 0 ? (
                                    <div className="text-center py-4 text-gray-600 text-xs font-mono italic">
                                        // No clips added yet
                                    </div>
                                ) : (
                                    manualClips.map((clip, idx) => (
                                        <div key={clip.id} className="flex items-center justify-between bg-black/30 border border-gray-700 p-2 rounded group hover:border-neon-amber/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-500 font-mono text-xs">#{idx + 1}</span>
                                                <span className="text-neon-green font-mono text-sm">{formatTime(clip.start)}</span>
                                                <span className="text-gray-600">➜</span>
                                                <span className="text-neon-red font-mono text-sm">{formatTime(clip.end)}</span>
                                                <span className="text-gray-500 text-[10px] ml-2">({Math.round(clip.end - clip.start)}s)</span>
                                            </div>
                                            <button
                                                onClick={() => removeManualClip(clip.id)}
                                                className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status Message Display */}
                    {isAnalyzing && statusMessage && (
                        <div className="border border-neon-amber/50 bg-neon-amber/10 p-3 rounded animate-fade-in">
                            <p className="font-mono text-xs text-neon-amber text-center">
                                {statusMessage}
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={onSubmit}
                        disabled={isAnalyzing || (mode === 'manual' && manualClips.length === 0)}
                        className={`
                            w-full py-3 md:py-4 flex items-center justify-center gap-2 group relative overflow-hidden transition-all
                            ${(mode === 'manual' && manualClips.length === 0)
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border-none'
                                : 'btn-primary'
                            }
                        `}
                    >
                        {isAnalyzing ? (
                            <>
                                <span className="spinner w-4 h-4 md:w-5 md:h-5 border-2"></span>
                                <span className="font-mono text-xs md:text-sm">{t('processing')} {estimatedTimeRemaining && `(${estimatedTimeRemaining})`}</span>
                            </>
                        ) : (
                            <>
                                <span className="font-mono text-xs md:text-sm font-bold relative z-10">&gt; {t('config.analyzeButton')}</span>
                                <div className="absolute inset-0 bg-neon-green/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

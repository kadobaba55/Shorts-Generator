'use client'

import { useLanguage } from './LanguageProvider'

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
    onSubmit: () => void
    onBack: () => void
    isAnalyzing: boolean
    estimatedTimeRemaining?: string
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
    onSubmit,
    onBack,
    isAnalyzing,
    estimatedTimeRemaining
}: ConfigStepProps) {
    const { t } = useLanguage()

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
                                {t('config.duration')}: {Math.floor(videoInfo.duration / 60)}:{String(Math.floor(videoInfo.duration % 60)).padStart(2, '0')}
                            </div>
                        </div>
                    )}

                    {/* Language Selection */}
                    <div className="space-y-2">
                        <label className="font-mono text-xs md:text-sm text-neon-amber">
                            &gt; {t('config.language')}:
                        </label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="w-full input-retro"
                        >
                            <option value="tr">🇹🇷 TURKISH</option>
                            <option value="en">🇺🇸 ENGLISH</option>
                            <option value="de">🇩🇪 GERMAN</option>
                            <option value="es">🇪🇸 SPANISH</option>
                            <option value="fr">🇫🇷 FRENCH</option>
                            <option value="auto">🌐 {t('config.auto')}</option>
                        </select>
                    </div>

                    {/* Whisper Model Selection */}
                    <div className="space-y-2">
                        <label className="font-mono text-xs md:text-sm text-neon-amber">
                            &gt; {t('config.model')}:
                        </label>
                        <select
                            value={whisperModel}
                            onChange={(e) => setWhisperModel(e.target.value as any)}
                            className="w-full input-retro"
                        >
                            <option value="tiny">⚡ TINY - Fast</option>
                            <option value="base">🚀 BASE - Balanced</option>
                            <option value="small">⚖️ SMALL - Better</option>
                            <option value="medium">🎯 MEDIUM - Best</option>
                        </select>
                        <p className="font-mono text-[10px] md:text-xs text-gray-500">
                            // Faster = less accurate
                        </p>
                    </div>

                    {/* AI Mode Toggle */}
                    <div className="border border-neon-cyan/30 p-3 md:p-4 bg-bg-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-mono text-xs md:text-sm text-neon-cyan">
                                    [✨] AI_CLIP_GENERATOR
                                </div>
                                <div className="font-mono text-[10px] md:text-xs text-gray-500 mt-1">
                                    // Auto-detect moments
                                </div>
                            </div>
                            <button
                                onClick={() => setMode(mode === 'auto' ? 'manual' : 'auto')}
                                className={`
                                    w-14 md:w-16 h-7 md:h-8 border-2 transition-all font-mono text-xs
                                    ${mode === 'auto'
                                        ? 'border-neon-green bg-neon-green text-black'
                                        : 'border-gray-600 text-gray-600'
                                    }
                                `}
                            >
                                {mode === 'auto' ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    {/* Auto Mode Settings */}
                    {mode === 'auto' && (
                        <div className="border border-neon-magenta/30 p-3 md:p-4 bg-bg-card space-y-4 animate-fade-in">
                            <div className="font-mono text-xs text-neon-magenta mb-2">
                                &gt; {t('config.auto').toUpperCase()}:
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

                    {/* Submit Button */}
                    <button
                        onClick={onSubmit}
                        disabled={isAnalyzing}
                        className="w-full btn-primary py-3 md:py-4 flex items-center justify-center gap-2 group relative overflow-hidden"
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

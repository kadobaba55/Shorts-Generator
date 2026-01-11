'use client'

import { useState } from 'react'
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

interface ClipEditorProps {
    processedClips: ProcessedClip[]
    setProcessedClips: (clips: ProcessedClip[]) => void
    isGeneratingClips: boolean
    isAnalyzing?: boolean
    processProgress: number
    onBack: () => void
    onAddSubtitles: (clipIndex: number) => Promise<void>
    onAddSubtitlesToAll: () => Promise<void>
}

export default function ClipEditor({
    processedClips,
    setProcessedClips,
    isGeneratingClips,
    isAnalyzing = false,
    processProgress,
    onBack,
    onAddSubtitles,
    onAddSubtitlesToAll
}: ClipEditorProps) {
    const [selectedClipIndex, setSelectedClipIndex] = useState(0)

    const selectedClip = processedClips[selectedClipIndex]

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Ayarlara Dön
                </button>
                <h2 className="text-xl font-bold">Klip Düzenleyici</h2>
            </div>

            {/* Analysis Status */}
            {isAnalyzing && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">🤖 AI video analiz ediyor...</span>
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent"></div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">En ilgi çekici anlar tespit ediliyor...</p>
                </div>
            )}

            {/* Processing Status */}
            {isGeneratingClips && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Klipler oluşturuluyor...</span>
                        <span className="text-sm text-purple-400">{processProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full"
                            style={{ width: `${processProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Main Content */}
            {processedClips.length > 0 && !isGeneratingClips && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left: Video Preview */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-dark-300 rounded-2xl overflow-hidden border border-white/5">
                            <video
                                key={selectedClip?.subtitledPath || selectedClip?.videoPath}
                                src={selectedClip?.subtitledPath || selectedClip?.videoPath}
                                controls
                                className="w-full aspect-[9/16] object-contain bg-black"
                            />
                        </div>

                        {/* Clip Info */}
                        <div className="bg-dark-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Klip {selectedClipIndex + 1}</h3>
                                <span className="text-sm text-gray-400">
                                    {selectedClip?.duration.toFixed(1)}s
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {selectedClip?.hasSubtitles ? (
                                    <span className="inline-flex items-center gap-2 text-sm text-green-400">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Altyazılı
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => onAddSubtitles(selectedClipIndex)}
                                        disabled={selectedClip?.isProcessing}
                                        className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                                    >
                                        {selectedClip?.isProcessing ? 'İşleniyor...' : '+ Altyazı Ekle'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Clip List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Tüm Klipler ({processedClips.length})</h3>
                            <button
                                onClick={onAddSubtitlesToAll}
                                className="text-xs text-purple-400 hover:text-purple-300"
                            >
                                Tümüne Altyazı Ekle
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {processedClips.map((clip, index) => (
                                <button
                                    key={clip.id}
                                    onClick={() => setSelectedClipIndex(index)}
                                    className={`w-full p-4 rounded-xl text-left transition-all ${selectedClipIndex === index
                                        ? 'bg-purple-500/20 border-2 border-purple-500'
                                        : 'bg-dark-200 border border-white/5 hover:bg-dark-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">Klip {index + 1}</span>
                                        {clip.hasSubtitles && (
                                            <span className="text-green-400 text-xs">✓ Altyazılı</span>
                                        )}
                                        {clip.isProcessing && (
                                            <span className="text-purple-400 text-xs animate-pulse">⏳ İşleniyor</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Export All Button */}
                        <button
                            onClick={() => {
                                processedClips.forEach((clip, i) => {
                                    const downloadPath = clip.subtitledPath || clip.videoPath
                                    const link = document.createElement('a')
                                    link.href = downloadPath
                                    link.download = `clip-${i + 1}.mp4`
                                    link.click()
                                })
                                toast.success('Tüm klipler indiriliyor!')
                            }}
                            className="w-full btn-primary py-3 rounded-xl font-semibold"
                        >
                            Tümünü İndir 🚀
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {processedClips.length === 0 && !isGeneratingClips && (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🎬</div>
                    <h3 className="text-xl font-semibold mb-2">Henüz klip yok</h3>
                    <p className="text-gray-400">Klip oluşturmak için ayarlara dönün</p>
                </div>
            )}
        </div>
    )
}

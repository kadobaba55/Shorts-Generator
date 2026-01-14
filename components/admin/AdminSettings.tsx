'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export default function AdminSettings() {
    const [transcriptionMode, setTranscriptionMode] = useState<'local' | 'deepgram'>('deepgram')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings')
            if (res.ok) {
                const data = await res.json()
                if (data.transcription_mode) {
                    // Map old values to new if necessary, or just use as is if matches
                    const mode = data.transcription_mode
                    if (mode === 'cloud' || mode === 'cloud_force') {
                        // Migrate legacy cloud to deepgram
                        setTranscriptionMode('deepgram')
                    } else {
                        setTranscriptionMode(mode as 'local' | 'deepgram')
                    }
                } else {
                    setTranscriptionMode('deepgram') // Default to Deepgram
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
            toast.error('Ayarlar yüklenemedi')
        } finally {
            setIsLoading(false)
        }
    }

    const handleModeChange = async (newMode: 'local' | 'deepgram') => {
        if (newMode === transcriptionMode) return

        setIsSaving(true)
        // Optimistic update
        setTranscriptionMode(newMode)

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'transcription_mode', value: newMode })
            })

            if (!res.ok) throw new Error('Failed to save')

            let modeName = 'Yerel (Whisper)'
            if (newMode === 'deepgram') modeName = 'Deepgram (Cloud)'

            toast.success(`Mod değiştirildi: ${modeName}`)
        } catch (error) {
            console.error('Failed to save setting:', error)
            toast.error('Ayar kaydedilemedi')
            // Revert
            setTranscriptionMode(transcriptionMode)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="neon-card p-6"
        >
            <h2 className="text-xl font-heading text-kado-text mb-6 flex items-center gap-3">
                <span className="text-kado-primary">⚙️</span>
                Sistem Ayarları
            </h2>

            {isLoading ? (
                <div className="flex items-center gap-2 text-kado-text-muted">
                    <div className="spinner w-4 h-4" /> Yükleniyor...
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Transcription Mode Selector */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-kado-bg/50 rounded-xl border border-kado-border/50 hover:border-kado-primary/30 transition-colors gap-4">
                        <div className="space-y-1">
                            <h3 className="text-kado-text font-medium text-lg">Transkripsiyon Motoru</h3>
                            <p className="text-sm text-kado-text-secondary max-w-md">
                                Videoların altyazıya nasıl dönüştürüleceğini seçin.
                            </p>
                        </div>

                        <div className="flex items-center bg-[#0F172A] p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => handleModeChange('deepgram')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'deepgram'
                                    ? 'bg-gradient-to-r from-neon-green to-neon-cyan text-black shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                🚀 Deepgram (Cloud)
                            </button>
                            <button
                                onClick={() => handleModeChange('local')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'local'
                                    ? 'bg-gray-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                💻 Whisper (Local)
                            </button>
                        </div>
                    </div>

                    {/* Info Box based on selection */}
                    <div className={`text-xs p-3 rounded-lg border transition-colors duration-300
                        ${transcriptionMode === 'local' ? 'bg-gray-500/10 border-gray-500/20 text-gray-300' : ''}
                        ${transcriptionMode === 'deepgram' ? 'bg-neon-green/10 border-neon-green/20 text-neon-green' : ''}
                    `}>
                        {transcriptionMode === 'local' && (
                            <span>ℹ️ <b>Yerel Mod (Whisper):</b> Sunucu işlemcisini kullanır. Ücretsizdir ancak yavaştır ve yüksek CPU tüketir.</span>
                        )}
                        {transcriptionMode === 'deepgram' && (
                            <span>ℹ️ <b>Deepgram (Tavsiye Edilen):</b> Saniyeler içinde sonuç verir. Yüksek doğruluk ve düşük sunucu yükü sağlar. (API Key gerektirir)</span>
                        )}
                        {transcriptionMode !== 'local' && transcriptionMode !== 'deepgram' && (
                            <span>⚠️ <b>Bilinmeyen Mod:</b> Lütfen geçerli bir seçenek belirleyin.</span>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    )
}

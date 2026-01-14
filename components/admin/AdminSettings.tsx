'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export default function AdminSettings() {
    const [transcriptionMode, setTranscriptionMode] = useState<'local' | 'cloud' | 'cloud_force'>('local')
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
                    setTranscriptionMode(data.transcription_mode as 'local' | 'cloud' | 'cloud_force')
                } else {
                    setTranscriptionMode('local')
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
            toast.error('Ayarlar yüklenemedi')
        } finally {
            setIsLoading(false)
        }
    }

    const handleModeChange = async (newMode: 'local' | 'cloud' | 'cloud_force') => {
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

            let modeName = 'Yerel'
            if (newMode === 'cloud') modeName = 'Otomatik (Hibrit)'
            if (newMode === 'cloud_force') modeName = 'Bulut (Zorla)'

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
                                onClick={() => handleModeChange('local')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'local'
                                        ? 'bg-gray-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                💻 Yerel
                            </button>
                            <button
                                onClick={() => handleModeChange('cloud')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'cloud'
                                        ? 'bg-kado-primary text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                🔄 Otomatik
                            </button>
                            <button
                                onClick={() => handleModeChange('cloud_force')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'cloud_force'
                                        ? 'bg-red-600 text-white shadow-md'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                ☁️ Bulut (Zorla)
                            </button>
                        </div>
                    </div>

                    {/* Info Box based on selection */}
                    <div className={`text-xs p-3 rounded-lg border transition-colors duration-300
                        ${transcriptionMode === 'local' ? 'bg-gray-500/10 border-gray-500/20 text-gray-300' : ''}
                        ${transcriptionMode === 'cloud' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : ''}
                        ${transcriptionMode === 'cloud_force' ? 'bg-red-500/10 border-red-500/20 text-red-300' : ''}
                    `}>
                        {transcriptionMode === 'local' && (
                            <span>ℹ️ <b>Yerel Mod:</b> Sadece kendi sunucunu kullanır. Ücretsizdir ama işlemciyi yorar.</span>
                        )}
                        {transcriptionMode === 'cloud' && (
                            <span>ℹ️ <b>Otomatik (Hibrit) Mod:</b> Önce FreeSubtitles servisini dener. Hata alırsa (yoğunluk vb.) otomatik olarak Yerel moda düşer. En güvenli seçenektir.</span>
                        )}
                        {transcriptionMode === 'cloud_force' && (
                            <span>⚠️ <b>Bulut (Zorla) Modu:</b> Sadece FreeSubtitles servisini kullanır. Hata alırsa <u>işlemi durdurur ve hatayı gösterir.</u> Debug için kullanışlıdır.</span>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    )
}

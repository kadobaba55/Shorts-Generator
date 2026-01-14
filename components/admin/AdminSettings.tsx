'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export default function AdminSettings() {
    const [transcriptionMode, setTranscriptionMode] = useState<'local' | 'deepgram'>('deepgram')
    const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('cloud')
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
                // Transcription
                if (data.transcription_mode) {
                    const mode = data.transcription_mode
                    if (mode === 'cloud' || mode === 'cloud_force') {
                        setTranscriptionMode('deepgram')
                    } else {
                        setTranscriptionMode(mode as 'local' | 'deepgram')
                    }
                }

                // Storage
                if (data.storage_mode) {
                    setStorageMode(data.storage_mode as 'local' | 'cloud')
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
            toast.error('Ayarlar yüklenemedi')
        } finally {
            setIsLoading(false)
        }
    }

    const handleModeChange = async (key: string, value: string) => {
        setIsSaving(true)

        // Optimistic update
        if (key === 'transcription_mode') setTranscriptionMode(value as any)
        if (key === 'storage_mode') setStorageMode(value as any)

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            })

            if (!res.ok) throw new Error('Failed to save')

            toast.success(`Ayar güncellendi`)
        } catch (error) {
            console.error('Failed to save setting:', error)
            toast.error('Ayar kaydedilemedi')
            // Revert (simplified: just refetch)
            fetchSettings()
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
                                onClick={() => handleModeChange('transcription_mode', 'deepgram')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${transcriptionMode === 'deepgram'
                                    ? 'bg-gradient-to-r from-neon-green to-neon-cyan text-black shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                🚀 Deepgram (Cloud)
                            </button>
                            <button
                                onClick={() => handleModeChange('transcription_mode', 'local')}
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

                    {/* Storage Mode Selector */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-kado-bg/50 rounded-xl border border-kado-border/50 hover:border-neon-cyan/30 transition-colors gap-4">
                        <div className="space-y-1">
                            <h3 className="text-kado-text font-medium text-lg">Depolama Alanı</h3>
                            <p className="text-sm text-kado-text-secondary max-w-md">
                                Yüklenen videoların nerede saklanacağını seçin.
                            </p>
                        </div>

                        <div className="flex items-center bg-[#0F172A] p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => handleModeChange('storage_mode', 'cloud')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${storageMode === 'cloud'
                                    ? 'bg-gradient-to-r from-neon-cyan to-blue-500 text-black shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                ☁️ Cloudflare R2
                            </button>
                            <button
                                onClick={() => handleModeChange('storage_mode', 'local')}
                                disabled={isSaving}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${storageMode === 'local'
                                    ? 'bg-gray-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                📁 Local Disk
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-gray-400 opacity-60">
                        * Değişiklikler yeni yüklenen dosyalar için geçerli olur. Mevcut dosyalar taşınmaz.
                    </div>
                </div>
            )}
        </motion.div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'

export default function AdminSettings() {
    const [transcriptionMode, setTranscriptionMode] = useState<'local' | 'cloud'>('local')
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
                    setTranscriptionMode(data.transcription_mode as 'local' | 'cloud')
                } else {
                    // Default if not set
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

    const handleToggle = async () => {
        const newMode = transcriptionMode === 'local' ? 'cloud' : 'local'
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

            toast.success(`Mod değiştirildi: ${newMode === 'cloud' ? 'Bulut (FreeSubtitles)' : 'Yerel (Local CPU)'}`)
        } catch (error) {
            console.error('Failed to save setting:', error)
            toast.error('Ayar kaydedilemedi')
            // Revert optimistic update
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
                    {/* Transcription Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-kado-bg/50 rounded-xl border border-kado-border/50 hover:border-kado-primary/30 transition-colors">
                        <div className="space-y-1">
                            <h3 className="text-kado-text font-medium text-lg">Transkripsiyon Motoru</h3>
                            <p className="text-sm text-kado-text-secondary">
                                {transcriptionMode === 'cloud'
                                    ? 'Bulut Tabanlı (FreeSubtitles.ai) - Sunucuyu yormaz.'
                                    : 'Yerel İşlemci (Local Whisper) - Kendi sunucunu kullanır.'}
                            </p>
                        </div>

                        <button
                            onClick={handleToggle}
                            disabled={isSaving}
                            className={`
                                relative w-16 h-8 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-kado-primary/50
                                ${transcriptionMode === 'cloud' ? 'bg-kado-success' : 'bg-gray-600'}
                            `}
                        >
                            <span className="sr-only">Toggle Transcription Mode</span>
                            <span
                                className={`
                                    absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md flex items-center justify-center text-xs font-bold
                                    ${transcriptionMode === 'cloud' ? 'translate-x-8 text-kado-success' : 'translate-x-0 text-gray-600'}
                                `}
                            >
                                {transcriptionMode === 'cloud' ? '☁️' : '💻'}
                            </span>
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="text-xs text-kado-text-muted p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        ℹ️ <b>Not:</b> "Bulut" modu seçildiğinde sistem önce FreeSubtitles.ai servisini dener. Hata alırsa otomatik olarak "Yerel" moda düşer (Fallback).
                    </div>
                </div>
            )}
        </motion.div>
    )
}

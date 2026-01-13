'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface HeroProps {
    onVideoSubmit: (url: string) => void
    isDownloading: boolean
    downloadProgress: number
    estimatedTimeRemaining?: string
}

export default function Hero({ onVideoSubmit, isDownloading, downloadProgress, estimatedTimeRemaining }: HeroProps) {
    const [url, setUrl] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim()) {
            onVideoSubmit(url)
        }
    }

    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
            <div className="max-w-3xl w-full space-y-10 text-center">

                {/* Animated Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kado-surface border border-kado-border"
                >
                    <span className="animate-pulse w-2 h-2 rounded-full bg-kado-success" />
                    <span className="text-sm text-kado-text-secondary font-body">
                        AI destekli video düzenleme
                    </span>
                    <span className="text-lg">✨</span>
                </motion.div>

                {/* Main Heading */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                >
                    <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight">
                        <span className="text-kado-text">Uzun Videoları</span>
                        <br />
                        <span className="text-gradient">Viral Klipler</span>
                        <span className="text-kado-text">e Dönüştür</span>
                    </h1>
                    <p className="text-lg text-kado-text-secondary max-w-xl mx-auto font-body">
                        YouTube, podcast ve canlı yayınlarınızı AI ile analiz edin.
                        TikTok, Reels ve Shorts için mükemmel klipler oluşturun.
                    </p>
                </motion.div>

                {/* URL Input Form */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onSubmit={handleSubmit}
                    className="w-full"
                >
                    <div className={`
                        relative rounded-2xl overflow-hidden transition-all duration-300
                        ${isFocused ? 'shadow-glow-primary' : ''}
                    `}>
                        {/* Gradient Border Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-kado-primary via-kado-secondary to-kado-primary bg-[length:200%_auto] animate-shimmer rounded-2xl" />

                        <div className="relative m-[2px] bg-kado-surface rounded-2xl">
                            <div className="flex flex-col sm:flex-row items-stretch p-2 gap-2">
                                <div className="relative flex-1 flex items-center">
                                    <span className="absolute left-4 text-xl">🎬</span>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        placeholder="YouTube URL yapıştırın..."
                                        disabled={isDownloading}
                                        className="w-full pl-12 pr-4 py-4 bg-transparent text-kado-text font-body text-base placeholder-kado-text-muted focus:outline-none disabled:opacity-50"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isDownloading || !url.trim()}
                                    className="btn-primary py-4 px-8 rounded-xl text-base font-heading font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDownloading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="spinner w-5 h-5" />
                                            İndiriliyor...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Başla
                                            <span className="text-lg">🚀</span>
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {isDownloading && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 space-y-3"
                        >
                            <div className="flex items-center justify-between text-sm font-body">
                                <span className="text-kado-text-secondary flex items-center gap-2">
                                    <span className="animate-pulse">📥</span>
                                    Video indiriliyor...
                                </span>
                                <span className="text-kado-primary font-semibold">{downloadProgress}%</span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                            {estimatedTimeRemaining && (
                                <p className="text-xs text-kado-text-muted text-center font-body">
                                    ⏱️ Tahmini: {estimatedTimeRemaining} kaldı
                                </p>
                            )}
                        </motion.div>
                    )}
                </motion.form>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-3 gap-4 pt-8"
                >
                    {[
                        { icon: '✂️', title: 'Akıllı Kesim', desc: 'AI ile en iyi anları bul' },
                        { icon: '💬', title: 'Otomatik Altyazı', desc: 'Viral stil yazı efektleri' },
                        { icon: '🎯', title: 'Yüz Takibi', desc: 'Konuşmacıyı otomatik çerçevele' },
                    ].map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            className="group p-4 rounded-xl bg-kado-surface/50 border border-kado-border/50 hover:border-kado-primary/50 hover:bg-kado-surface transition-all cursor-default"
                        >
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                {feature.icon}
                            </div>
                            <h3 className="font-heading font-semibold text-kado-text mb-1">
                                {feature.title}
                            </h3>
                            <p className="text-xs text-kado-text-muted font-body">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-center gap-6 pt-4 text-kado-text-muted text-xs font-body"
                >
                    <span className="flex items-center gap-1">
                        <span className="text-kado-success">✓</span> Ücretsiz deneme
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="text-kado-success">✓</span> Kredi kartı gerekmez
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="text-kado-success">✓</span> Anında sonuç
                    </span>
                </motion.div>
            </div>
        </div>
    )
}

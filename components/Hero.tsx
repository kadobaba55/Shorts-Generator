'use client'

import { useState, useEffect } from 'react'

interface HeroProps {
    onVideoSubmit: (url: string) => void
    isDownloading: boolean
    downloadProgress: number
    estimatedTimeRemaining?: string
}

export default function Hero({ onVideoSubmit, isDownloading, downloadProgress, estimatedTimeRemaining }: HeroProps) {
    const [url, setUrl] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim()) {
            onVideoSubmit(url)
        }
    }

    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-8">
            <div className="max-w-2xl w-full space-y-8 text-center">

                {/* Basit Başlık */}
                <div className="space-y-4">
                    <h1 className="font-pixel text-2xl md:text-4xl text-neon-green">
                        Video Klip Oluşturucu
                    </h1>
                    <p className="font-mono text-sm md:text-base text-gray-400">
                        YouTube videolarından viral klipler oluşturun
                    </p>
                </div>

                {/* URL Input */}
                <form onSubmit={handleSubmit} className="w-full">
                    <div className="border-2 border-neon-green/50 bg-bg-terminal rounded-lg overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-stretch p-3 gap-3">
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="YouTube URL yapıştırın..."
                                disabled={isDownloading}
                                className="flex-1 px-4 py-3 bg-transparent text-white font-mono text-sm placeholder-gray-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={isDownloading || !url.trim()}
                                className="bg-neon-green text-black font-semibold py-3 px-6 rounded hover:bg-neon-green/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? 'Yükleniyor...' : 'Başla'}
                            </button>
                        </div>
                    </div>

                    {/* İlerleme Çubuğu */}
                    {isDownloading && (
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between font-mono text-sm">
                                <span className="text-gray-400">İndiriliyor...</span>
                                <span className="text-neon-green">{downloadProgress}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neon-green transition-all duration-300"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                            {estimatedTimeRemaining && (
                                <p className="font-mono text-xs text-gray-500 text-center">
                                    Tahmini: {estimatedTimeRemaining} kaldı
                                </p>
                            )}
                        </div>
                    )}
                </form>

                {/* Özellikler - Basit */}
                <div className="grid grid-cols-3 gap-4 pt-8 border-t border-gray-800">
                    <div className="text-center">
                        <div className="text-2xl mb-2">✂️</div>
                        <p className="font-mono text-xs text-gray-400">Otomatik Kesim</p>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl mb-2">💬</div>
                        <p className="font-mono text-xs text-gray-400">Altyazı Ekleme</p>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl mb-2">🎯</div>
                        <p className="font-mono text-xs text-gray-400">Yüz Takibi</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

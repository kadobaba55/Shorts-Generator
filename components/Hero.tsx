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
    const [displayText, setDisplayText] = useState('')
    const title = 'VIDEO CLIP STUDIO'

    // Typing effect for title
    useEffect(() => {
        let i = 0
        const timer = setInterval(() => {
            if (i <= title.length) {
                setDisplayText(title.slice(0, i))
                i++
            } else {
                clearInterval(timer)
            }
        }, 100)
        return () => clearInterval(timer)
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim()) {
            onVideoSubmit(url)
        }
    }

    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-8 relative">
            {/* CRT Scanlines Overlay */}
            <div className="crt-scanlines fixed inset-0 pointer-events-none z-50"></div>

            <div className="max-w-4xl w-full space-y-6 md:space-y-10 text-center">
                {/* Retro Badge */}
                <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 border-2 border-neon-green bg-bg-card animate-slide-up">
                    <span className="w-2 h-2 bg-neon-green animate-retro-blink"></span>
                    <span className="font-mono text-xs md:text-sm text-neon-green uppercase tracking-wider">
                        [ AI VIDEO EDITOR v2.0 ]
                    </span>
                </div>

                {/* Main Title with Typing Effect */}
                <h1 className="font-pixel text-lg sm:text-xl md:text-3xl lg:text-4xl neon-green neon-pulse leading-relaxed">
                    <span>{displayText}</span>
                    <span className="typing-cursor"></span>
                </h1>

                {/* Subtitle */}
                <p className="font-mono text-sm md:text-lg text-neon-amber animate-slide-up px-4">
                    &gt; YouTube'dan Viral Shorts'a Dönüştür_
                </p>

                {/* Feature Pills (Pixel Style) - Responsive */}
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 animate-slide-up px-4">
                    <span className="px-2 md:px-4 py-1 md:py-2 border-2 border-neon-cyan text-neon-cyan font-mono text-xs md:text-sm hover:bg-neon-cyan hover:text-black transition-all cursor-default">
                        [✨] SUBTITLE
                    </span>
                    <span className="px-2 md:px-4 py-1 md:py-2 border-2 border-neon-magenta text-neon-magenta font-mono text-xs md:text-sm hover:bg-neon-magenta hover:text-black transition-all cursor-default">
                        [🎯] FACE TRACK
                    </span>
                    <span className="px-2 md:px-4 py-1 md:py-2 border-2 border-neon-amber text-neon-amber font-mono text-xs md:text-sm hover:bg-neon-amber hover:text-black transition-all cursor-default">
                        [⚡] FAST
                    </span>
                </div>

                {/* Terminal-Style URL Input */}
                <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto animate-slide-up px-2">
                    <div className="border-2 border-neon-green bg-bg-terminal">
                        {/* Terminal Header - Hidden on very small screens */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-2 border-b border-neon-green/30">
                            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-red"></span>
                            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-amber"></span>
                            <span className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-neon-green"></span>
                            <span className="font-mono text-xs text-neon-green ml-2">terminal://input</span>
                        </div>

                        {/* Input Area */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center p-2">
                            <div className="flex items-center flex-1">
                                <span className="text-neon-green font-mono px-2 md:px-3 font-bold">&gt;</span>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="paste_youtube_url..."
                                    disabled={isDownloading}
                                    className="flex-1 px-2 py-3 bg-transparent text-neon-green font-mono text-sm placeholder-gray-600 focus:outline-none disabled:opacity-50 min-w-0"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isDownloading || !url.trim()}
                                className="btn-primary font-pixel text-xs py-3 px-4 mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto"
                            >
                                {isDownloading ? 'LOADING...' : 'RUN >>'}
                            </button>
                        </div>
                    </div>

                    {/* Retro Progress Bar */}
                    {isDownloading && (
                        <div className="mt-4 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between font-mono text-xs md:text-sm">
                                <span className="text-neon-amber truncate mr-2">
                                    {downloadProgress < 30 && '> Fetching...'}
                                    {downloadProgress >= 30 && downloadProgress < 60 && '> Downloading...'}
                                    {downloadProgress >= 60 && downloadProgress < 90 && '> Processing...'}
                                    {downloadProgress >= 90 && '> Finalizing...'}
                                </span>
                                <span className="text-neon-green">[{downloadProgress}%]</span>
                            </div>
                            <div className="progress-retro">
                                <div
                                    className="progress-retro-fill"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                            {/* Tahmini Kalan Süre */}
                            {estimatedTimeRemaining && (
                                <div className="flex items-center justify-center font-mono text-xs text-neon-cyan animate-pulse">
                                    <span className="mr-2">⏱</span>
                                    <span>Tahmini: {estimatedTimeRemaining} kaldı</span>
                                </div>
                            )}
                        </div>
                    )}
                </form>

                {/* Features Grid (Retro Cards) - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12 animate-slide-up px-2">
                    <div className="card-retro group hover:border-neon-cyan transition-all">
                        <div className="text-3xl md:text-4xl mb-3 md:mb-4 group-hover:animate-retro-blink">🤖</div>
                        <h3 className="font-pixel text-[10px] md:text-xs text-neon-cyan mb-2">AI ANALYSIS</h3>
                        <p className="font-mono text-xs text-gray-400">
                            Auto-detect best moments
                        </p>
                    </div>

                    <div className="card-retro group hover:border-neon-magenta transition-all">
                        <div className="text-3xl md:text-4xl mb-3 md:mb-4 group-hover:animate-retro-blink">⚡</div>
                        <h3 className="font-pixel text-[10px] md:text-xs text-neon-magenta mb-2">FAST RENDER</h3>
                        <p className="font-mono text-xs text-gray-400">
                            Ready in minutes
                        </p>
                    </div>

                    <div className="card-retro group hover:border-neon-amber transition-all">
                        <div className="text-3xl md:text-4xl mb-3 md:mb-4 group-hover:animate-retro-blink">🎬</div>
                        <h3 className="font-pixel text-[10px] md:text-xs text-neon-amber mb-2">PRO OUTPUT</h3>
                        <p className="font-mono text-xs text-gray-400">
                            Face tracking + subs
                        </p>
                    </div>
                </div>

                {/* Stats (Terminal Style) - Responsive */}
                <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto pt-6 md:pt-8 border-t-2 border-neon-green/30 animate-slide-up">
                    <div className="text-center">
                        <div className="font-pixel text-base md:text-xl text-neon-green neon-pulse">10K+</div>
                        <div className="font-mono text-[10px] md:text-xs text-gray-500 mt-1">VIDEOS</div>
                    </div>
                    <div className="text-center">
                        <div className="font-pixel text-base md:text-xl text-neon-cyan neon-pulse">50K+</div>
                        <div className="font-mono text-[10px] md:text-xs text-gray-500 mt-1">CLIPS</div>
                    </div>
                    <div className="text-center">
                        <div className="font-pixel text-base md:text-xl text-neon-amber neon-pulse">98%</div>
                        <div className="font-mono text-[10px] md:text-xs text-gray-500 mt-1">RATING</div>
                    </div>
                </div>

                {/* Footer Text */}
                <p className="font-mono text-[10px] md:text-xs text-gray-600 mt-6 md:mt-8">
                    [ Press ENTER to continue | Powered by AI ]
                </p>
            </div>
        </div>
    )
}

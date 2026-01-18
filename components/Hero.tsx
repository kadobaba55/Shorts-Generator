'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import LanguageSwitcher from './LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'
import { SplineScene } from '@/components/ui/SplineScene'
import { Spotlight } from '@/components/ui/Spotlight'
import { useDevicePerformance } from '@/lib/useDevicePerformance'

import { BackgroundPaths } from '@/components/ui/BackgroundPaths'

interface HeroProps {
    onVideoSubmit: (url: string) => void
    isDownloading: boolean
    downloadProgress: number
    estimatedTimeRemaining?: string
}

export default function Hero({ onVideoSubmit, isDownloading, downloadProgress, estimatedTimeRemaining }: HeroProps) {
    const [url, setUrl] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const { t } = useLanguage()
    const { shouldShow3D } = useDevicePerformance()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (url.trim()) {
            onVideoSubmit(url)
        }
    }

    return (
        <div className="min-h-[calc(100vh-200px)] px-4 py-12 relative overflow-hidden">
            {/* Background Paths */}
            <BackgroundPaths />

            {/* Spotlight Effect - Always show */}
            <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

            {/* Language Switcher - Absolute Top Right */}
            <div className="absolute top-4 right-4 z-50 pointer-events-auto">
                <LanguageSwitcher />
            </div>

            {/* Main Container - Two Column Layout */}
            <div className="max-w-7xl mx-auto h-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4">

                {/* Left Side - Content */}
                <div className="flex-1 w-full lg:max-w-xl space-y-8 text-center lg:text-left relative z-10">

                    {/* Animated Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kado-surface border border-kado-border"
                    >
                        <span className="animate-pulse w-2 h-2 rounded-full bg-kado-success" />
                        <span className="text-sm text-kado-text-secondary font-body">
                            {t('home.badge')}
                        </span>
                    </motion.div>

                    {/* Main Heading */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-4"
                    >
                        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                            <span className="text-kado-text">{t('home.hero.titlePrefix')}</span>
                            <br />
                            <span className="text-gradient">{t('home.hero.titleHighlight')}</span>
                            <span className="text-kado-text">{t('home.hero.titleSuffix')}</span>
                        </h1>
                        <p className="text-lg text-kado-text-secondary max-w-lg mx-auto lg:mx-0 font-body">
                            {t('home.hero.subtitle')}
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
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                            placeholder={t('home.hero.inputPlaceholder')}
                                            disabled={isDownloading}
                                            className="w-full px-4 py-4 bg-transparent text-kado-text font-body text-base placeholder-kado-text-muted focus:outline-none disabled:opacity-50"
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
                                                {t('home.hero.downloading')}
                                            </span>
                                        ) : (
                                            t('home.hero.startButton')
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
                                    <span className="text-kado-text-secondary">
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
                                    <p className="text-xs text-kado-text-muted text-center lg:text-left font-body">
                                        Tahmini: {estimatedTimeRemaining} kaldı
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
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                        {[
                            { title: t('home.features.smartCut'), desc: t('home.features.smartCutDesc') },
                            { title: t('home.features.autoSubtitle'), desc: t('home.features.autoSubtitleDesc') },
                            { title: t('home.features.faceTracking'), desc: t('home.features.faceTrackingDesc') },
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className="group p-3 rounded-xl bg-kado-surface/50 border border-kado-border/50 hover:border-kado-primary/50 hover:bg-kado-surface transition-all cursor-default"
                            >
                                <h3 className="font-heading font-semibold text-kado-text text-sm mb-1">
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
                        className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-kado-text-muted text-xs font-body"
                    >
                        <span className="flex items-center gap-1">
                            <span className="text-kado-success">✓</span> {t('home.trust.free')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="text-kado-success">✓</span> {t('home.trust.noCard')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="text-kado-success">✓</span> {t('home.trust.instant')}
                        </span>
                    </motion.div>
                </div>

                {/* Right Side - 3D Robot */}
                {shouldShow3D && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex-1 w-full h-[400px] lg:h-[600px] relative pointer-events-auto"
                    >
                        <SplineScene
                            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                            className="w-full h-full"
                        />
                    </motion.div>
                )}
            </div>
        </div>
    )
}

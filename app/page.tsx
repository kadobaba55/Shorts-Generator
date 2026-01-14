'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import Hero from '@/components/Hero'
import { formatTimeRemaining } from '@/lib/estimateTime'
import { useLanguage } from '@/components/LanguageProvider'

export default function Home() {
    const { data: session } = useSession()
    const router = useRouter()
    const { t } = useLanguage()

    // Download State
    const [url, setUrl] = useState('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [downloadETA, setDownloadETA] = useState('')

    // Download Video and redirect to config page
    const handleDownload = async (videoUrl: string) => {
        // Enforce login
        if (!session) {
            toast.error('Video indirebilmek için giriş yapmalısınız')
            router.push('/login')
            return
        }

        console.log('Starting download:', videoUrl)
        setUrl(videoUrl)
        setIsDownloading(true)
        setDownloadProgress(0)
        setDownloadETA('Hesaplanıyor...')

        try {
            // Start download job
            const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoUrl })
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Download failed')
            }

            const { jobId } = await res.json()
            console.log('Download started, Job ID:', jobId)

            // Poll for status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/status?id=${jobId}`)
                    if (!statusRes.ok) return

                    const job = await statusRes.json()
                    console.log('Download Job Status:', job)

                    if (job.status === 'processing') {
                        setDownloadProgress(job.progress)
                        if (job.eta) {
                            setDownloadETA(job.eta)
                        } else {
                            const elapsed = (Date.now() - job.startTime) / 1000
                            if (job.progress > 0) {
                                const totalTime = elapsed / (job.progress / 100)
                                const remaining = totalTime - elapsed
                                setDownloadETA(formatTimeRemaining(remaining))
                            }
                        }
                    } else if (job.status === 'completed') {
                        clearInterval(pollInterval)
                        setDownloadProgress(100)
                        setDownloadETA('Tamamlandı!')

                        const { videoPath, title, duration } = job.result

                        // Generate video ID from path
                        const videoId = videoPath.split('/').pop()?.replace('.mp4', '') || Date.now().toString()

                        // Save video data to localStorage for config page
                        const videoData = {
                            videoPath,
                            title,
                            duration,
                            url: videoUrl,
                            timestamp: Date.now()
                        }
                        localStorage.setItem(`kadostudio_video_${videoId}`, JSON.stringify(videoData))

                        toast.success('Video indirildi!')

                        // Redirect to config page
                        setTimeout(() => {
                            router.push(`/config/${videoId}`)
                        }, 500)

                    } else if (job.status === 'error') {
                        clearInterval(pollInterval)
                        throw new Error(job.error || 'İndirme hatası')
                    }
                } catch (e) {
                    console.error('Polling error:', e)
                }
            }, 1000)

        } catch (error: any) {
            console.error('Download error:', error)
            toast.error(error.message || 'İndirme hatası')
            setDownloadProgress(0)
            setDownloadETA('')
            setIsDownloading(false)
        }
    }

    return (
        <main className="min-h-screen bg-kado-bg text-kado-text relative overflow-hidden">

            {/* Background Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-kado-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-kado-secondary/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 border-b border-kado-border/50 bg-kado-bg/80 backdrop-blur-lg sticky top-0">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <Link href="/" className="relative w-12 h-12 hover:scale-105 transition-transform">
                            <Image
                                src="/logo_final.png"
                                alt="Kadostudio"
                                fill
                                className="object-contain"
                                priority
                            />
                        </Link>
                        <span className="hidden md:block font-heading font-bold text-xl text-kado-text">
                            Kadostudio
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {/* Links removed per request */}
                    </nav>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-3">
                        {session ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-kado-surface border border-kado-border hover:border-kado-primary transition-all"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-kado-primary to-kado-secondary flex items-center justify-center font-heading font-bold text-sm text-white">
                                        {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                                    </div>
                                    <div className="hidden sm:flex flex-col items-start">
                                        <span className="text-sm font-body text-kado-text">{session.user?.name}</span>
                                        <span className="text-xs text-kado-accent font-semibold">{session.user?.tokens} {t('nav.credits')}</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="btn-ghost text-sm px-3 py-2 rounded-lg"
                                >
                                    {t('nav.logout')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link href="/login" className="btn-ghost text-sm px-4 py-2 rounded-lg">
                                    {t('nav.login')}
                                </Link>
                                <Link href="/register" className="btn-primary text-sm px-4 py-2 rounded-lg">
                                    {t('nav.register')}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Area - Hero */}
            <div className="relative z-10 container mx-auto px-4 pb-12">
                <Hero
                    onVideoSubmit={handleDownload}
                    isDownloading={isDownloading}
                    downloadProgress={downloadProgress}
                    estimatedTimeRemaining={downloadETA}
                />
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-kado-border/50 py-8 mt-auto">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-kado-text-muted font-body">
                        {t('footer.copyright')}
                    </p>
                    <div className="flex items-center gap-4">
                        <a href="mailto:kadostudiomarketing@gmail.com" className="text-sm text-kado-text-secondary hover:text-kado-primary transition-colors">
                            {t('footer.support')}
                        </a>
                    </div>
                </div>
            </footer>
        </main>
    )
}

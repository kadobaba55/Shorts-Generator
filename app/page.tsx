'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import Hero from '@/components/Hero'
import { formatTimeRemaining } from '@/lib/estimateTime'

export default function Home() {
    const { data: session } = useSession()
    const router = useRouter()

    // Download State
    const [url, setUrl] = useState('')
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [downloadETA, setDownloadETA] = useState('')

    // Download Video and redirect to config page
    const handleDownload = async (videoUrl: string) => {
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
        <main className="min-h-screen bg-bg-terminal text-white relative">

            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Logo Icon */}
                        <Link href="/" className="relative w-14 h-14 hover:opacity-80 transition-opacity animate-pulse-slow">
                            <Image
                                src="/logo_final.png"
                                alt="Kadostudio"
                                fill
                                className="object-contain"
                                priority
                            />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/pricing" className="hidden md:block font-mono text-xs text-gray-500 hover:text-neon-cyan transition-colors border border-neon-cyan/30 px-3 py-1 rounded hover:bg-neon-cyan/5">
                            [ UPGRADE_SYSTEM ]
                        </Link>
                        {session ? (
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-3 border border-neon-green/30 px-4 py-2 hover:border-neon-green hover:bg-neon-green/10 transition-all"
                                >
                                    <div className="w-8 h-8 border-2 border-neon-green flex items-center justify-center font-pixel text-xs text-neon-green">
                                        {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                                    </div>
                                    <div className="flex flex-col items-start font-mono text-xs">
                                        <span className="text-neon-green">{session.user?.name}</span>
                                        <span className="text-neon-amber">{session.user?.tokens} CREDITS</span>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="font-mono text-xs text-gray-500 hover:text-neon-red transition-colors"
                                >
                                    [LOGOUT]
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="font-mono text-sm text-neon-green hover:text-neon-amber transition-colors">
                                    [LOGIN]
                                </Link>
                                <Link href="/register" className="btn-secondary text-sm px-4 py-2">
                                    REGISTER
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Area - Only Hero */}
            <div className="container mx-auto px-4 pb-12">
                <Hero
                    onVideoSubmit={handleDownload}
                    isDownloading={isDownloading}
                    downloadProgress={downloadProgress}
                    estimatedTimeRemaining={downloadETA}
                />
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-6 mt-auto">
                <div className="container mx-auto px-4 text-center font-mono text-xs text-gray-500">
                    <p>© 2026 Kadostudio. Video içerikleri için yapay zeka destekli klip oluşturucu.</p>
                </div>
            </footer>
        </main>
    )
}

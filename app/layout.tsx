import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import { Toaster } from 'react-hot-toast'

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#00ff41',
}

export const metadata: Metadata = {
    title: 'Tidal Feynman - AI Video Alchemist',
    description: 'Forge viral content from raw video matter using Quantum-AI processing, automatic subtitles, and neural face tracking.',
    keywords: ['video editing', 'ai', 'viral clips', 'tiktok', 'youtube shorts', 'automation', 'transcription'],
    authors: [{ name: 'Tidal Feynman Systems' }],
    metadataBase: new URL('https://tidal-feynman.com'), // Production domain placeholder
    openGraph: {
        title: 'Tidal Feynman - AI Video Alchemist',
        description: 'Advanced video transmutation system for creators.',
        type: 'website',
        locale: 'tr_TR',
        siteName: 'Tidal Feynman',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Tidal Feynman',
        description: 'Quantum-AI powered video processing.',
        creator: '@tidalfeynman',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="tr" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body className="font-mono antialiased">
                <AuthProvider>
                    {/* Main Content */}
                    <div className="min-h-screen bg-bg-terminal relative">
                        {children}
                    </div>

                    {/* Retro Toaster */}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#0d1117',
                                color: '#00ff41',
                                border: '2px solid #00ff41',
                                borderRadius: '0',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '14px',
                                padding: '12px 16px',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#00ff41',
                                    secondary: '#0d1117',
                                },
                            },
                            error: {
                                style: {
                                    borderColor: '#ff0040',
                                    color: '#ff0040',
                                },
                                iconTheme: {
                                    primary: '#ff0040',
                                    secondary: '#0d1117',
                                },
                            },
                            loading: {
                                iconTheme: {
                                    primary: '#ffb000',
                                    secondary: '#0d1117',
                                },
                            },
                        }}
                    />
                </AuthProvider>
            </body>
        </html>
    )
}

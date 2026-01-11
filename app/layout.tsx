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
    title: 'Kadostudio - AI Video Klip Oluşturucu',
    description: 'YouTube videolarından viral TikTok ve YouTube Shorts klipler oluştur. Otomatik altyazı, yüz takibi ve yapay zeka destekli video düzenleme.',
    keywords: ['video düzenleme', 'ai', 'viral klipler', 'tiktok', 'youtube shorts', 'otomasyon', 'altyazı', 'shorts oluşturucu'],
    authors: [{ name: 'Kadostudio' }],
    metadataBase: new URL('https://kadostudio.dev'),
    icons: {
        icon: '/logo_final.png',
        apple: '/logo_final.png',
    },
    openGraph: {
        title: 'Kadostudio - AI Video Klip Oluşturucu',
        description: 'YouTube videolarından viral klipler oluştur. Otomatik altyazı ve yüz takibi.',
        type: 'website',
        locale: 'tr_TR',
        siteName: 'Kadostudio',
        url: 'https://kadostudio.dev',
        images: ['/logo_final.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Kadostudio',
        description: 'AI destekli video klip oluşturucu.',
        creator: '@kadostudio',
        images: ['/logo_final.png'],
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

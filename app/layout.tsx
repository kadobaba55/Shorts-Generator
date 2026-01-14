import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import { LanguageProvider } from '@/components/LanguageProvider'
import { Toaster } from 'react-hot-toast'
import packageJson from '../package.json'

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

// Try to import generated version, fallback to package.json
let appVersion = packageJson.version
try {
    const versionData = require('../version.json')
    appVersion = versionData.version
} catch (e) {
    // version.json might not exist in dev before first run
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
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Lato:wght@400;700;900&family=Oswald:wght@400;500;700&family=Raleway:wght@400;600;700&family=Nunito:wght@400;600;700&family=Source+Sans+Pro:wght@400;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="font-mono antialiased">
                <AuthProvider>
                    <LanguageProvider>
                        {/* Main Content */}
                        <div className="min-h-screen bg-bg-terminal relative">
                            {children}
                        </div>
                    </LanguageProvider>


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

                {/* Version Indicator */}
                <div className="fixed bottom-2 right-4 text-[10px] text-gray-700 font-mono pointer-events-none select-none z-50 opacity-50 hover:opacity-100 transition-opacity">
                    v{appVersion}
                </div>
            </body>
        </html >
    )
}

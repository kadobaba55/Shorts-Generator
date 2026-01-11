/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            // Production domain'i için NEXT_PUBLIC_DOMAIN env variable kullanılacak
            allowedOrigins: [
                'localhost:3000',
                'localhost',
                process.env.NEXT_PUBLIC_DOMAIN || ''
            ].filter(Boolean)
        }
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // Security Headers
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()"
                    }
                ],
            },
        ]
    },
}

module.exports = nextConfig

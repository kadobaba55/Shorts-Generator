import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    const path = req.nextUrl.pathname

    // Protected routes - redirect to login if not authenticated
    if (path.startsWith('/admin') || path.startsWith('/profile')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', req.url))
        }
    }

    // Auth pages - redirect to home if already authenticated
    if (path === '/login' || path === '/register') {
        if (token) {
            return NextResponse.redirect(new URL('/', req.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/profile/:path*', '/login', '/register'],
}

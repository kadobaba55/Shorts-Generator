import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveCookies, hasCookies, getCookieAge } from '@/lib/ytdlpCookies'

/**
 * GET /api/cookies - Check cookie status
 */
export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can check cookie status
    const isAdmin = (session.user as any).role === 'admin'
    if (!isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const exists = hasCookies()
    const age = getCookieAge()

    return NextResponse.json({
        hasCookies: exists,
        cookieAgeDays: age,
        status: !exists ? 'missing' : age > 14 ? 'warning' : 'ok',
        message: !exists
            ? 'Cookie dosyası yok. Lütfen yükleyin.'
            : age > 14
                ? `Cookie'ler ${age} gün önce yüklendi. Yakında yenilenmeleri gerekebilir.`
                : `Cookie'ler aktif (${age} gün önce yüklendi)`
    })
}

/**
 * POST /api/cookies - Upload new cookies
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can upload cookies
    const isAdmin = (session.user as any).role === 'admin'
    if (!isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    try {
        const { cookies } = await request.json()

        if (!cookies || typeof cookies !== 'string') {
            return NextResponse.json(
                { error: 'Cookie içeriği gerekli' },
                { status: 400 }
            )
        }

        // Validate cookie format (Netscape format)
        if (!cookies.includes('youtube.com') && !cookies.includes('.youtube.com')) {
            return NextResponse.json(
                { error: 'Geçersiz cookie formatı. YouTube cookie\'leri içermeli.' },
                { status: 400 }
            )
        }

        saveCookies(cookies)
        console.log('✅ YouTube cookies updated by admin')

        return NextResponse.json({
            success: true,
            message: 'Cookie\'ler başarıyla kaydedildi'
        })

    } catch (error) {
        console.error('Cookie save error:', error)
        return NextResponse.json(
            { error: 'Cookie kaydetme hatası' },
            { status: 500 }
        )
    }
}

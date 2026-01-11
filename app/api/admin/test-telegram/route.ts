import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification, formatError } from '@/lib/telegram'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    // Sadece admin test edebilir
    if (!session || (session.user as any)?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Test bildirimi gönder
        const testError = new Error('Bu bir test hatasıdır! 🧪')
        const msg = formatError('Test Endpoint', testError, {
            user: session.user?.email,
            test: true
        })

        await sendTelegramNotification(msg)

        return NextResponse.json({ success: true, message: 'Test bildirimi gönderildi' })
    } catch (error) {
        return NextResponse.json({ error: 'Test başarısız' }, { status: 500 })
    }
}

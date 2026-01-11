import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldFiles } from '@/lib/cleanup'

export const dynamic = 'force-dynamic' // Statik olmasını engelle

export async function GET(req: NextRequest) {
    // Güvenlik: Cron job'ı sadece yetkili bir servisin veya adminin tetikleyebilmesi için
    // Basit bir "CRON_SECRET" kontrolü önerilir.
    // Şimdilik Local/Docker ortamı için Authorizaton header kontrolü ekliyorum.

    const authHeader = req.headers.get('authorization')

    // Production'da bu secret 'env' ile gelmeli.
    // Örn: Vercel Cron kullanıyorsanız CRON_SECRET otomatik gelir.
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await cleanupOldFiles()
        return NextResponse.json({ success: true, ...result })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

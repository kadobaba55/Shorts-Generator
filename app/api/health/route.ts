import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * Sunucu sağlığını kontrol etmek için kullanılır.
 * Monitoring araçları (UptimeRobot, Pingdom vb.) bu endpoint'i kullanır.
 */
export async function GET() {
    try {
        // Basit health check - sunucu çalışıyor mu?
        const healthCheck = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        };

        return NextResponse.json(healthCheck, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { status: 'error', message: 'Health check failed' },
            { status: 503 }
        );
    }
}

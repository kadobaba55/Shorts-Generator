import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    const session = await getServerSession(authOptions)

    // Sadece admin görebilir
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // @ts-ignore
        const osu = require('node-os-utils')
        const cpu = osu.cpu
        const mem = osu.mem
        const drive = osu.drive
        const os = osu.os

        const cpuUsage = await cpu.usage()
        const memInfo = await mem.info()
        const driveInfo = await drive.info('/')

        const stats = {
            cpu: cpuUsage,
            memory: {
                total: memInfo.totalMemMb,
                used: memInfo.usedMemMb,
                free: memInfo.freeMemMb,
                percentage: (100 - memInfo.freeMemPercentage).toFixed(2)
            },
            disk: {
                total: driveInfo.totalGb,
                used: driveInfo.usedGb,
                free: driveInfo.freeGb,
                percentage: driveInfo.usedPercentage
            },
            uptime: os.uptime()
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Stats error' }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import os from 'os'
import fs from 'fs'

export async function GET() {
    const session = await getServerSession(authOptions)

    // Sadece admin görebilir
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const cpus = os.cpus()
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem

        // CPU Load (1 min avg) - Basit bir yaklaşım
        // Load average / Core count * 100
        const loadAvg = os.loadavg()[0]
        const cpuPercentage = Math.min(100, Math.round((loadAvg / cpus.length) * 100))

        // Disk (Root path)
        let diskInfo = { total: 0, used: 0, free: 0, percentage: 0 }

        try {
            // Node 18+ statfs
            if (fs.statfsSync) {
                const stats = fs.statfsSync('/')
                const total = stats.bsize * stats.blocks
                const free = stats.bsize * stats.bfree
                const used = total - free

                diskInfo = {
                    total: Math.round(total / (1024 * 1024 * 1024)),
                    used: Math.round(used / (1024 * 1024 * 1024)),
                    free: Math.round(free / (1024 * 1024 * 1024)),
                    percentage: Math.round((used / total) * 100)
                }
            }
        } catch (e) {
            console.error('Disk stat error:', e)
        }

        const stats = {
            cpu: cpuPercentage,
            memory: {
                total: Math.round(totalMem / (1024 * 1024)),
                used: Math.round(usedMem / (1024 * 1024)),
                free: Math.round(freeMem / (1024 * 1024)),
                percentage: ((usedMem / totalMem) * 100).toFixed(2)
            },
            disk: {
                total: diskInfo.total,
                used: diskInfo.used,
                free: diskInfo.free,
                percentage: diskInfo.percentage
            },
            uptime: os.uptime()
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Stats error' }, { status: 500 })
    }
}

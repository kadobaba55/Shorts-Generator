import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { getR2Stats } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
    const session = await getServerSession(authOptions)

    // Sadece admin görebilir
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 1. CPU Usage Calculation (Sampled over 200ms)
        const startCpus = os.cpus()
        await new Promise(resolve => setTimeout(resolve, 200))
        const endCpus = os.cpus()

        let idleDiff = 0
        let totalDiff = 0

        for (let i = 0; i < startCpus.length; i++) {
            const start = startCpus[i].times
            const end = endCpus[i].times

            const startTotal = start.user + start.nice + start.sys + start.idle + start.irq
            const endTotal = end.user + end.nice + end.sys + end.idle + end.irq

            idleDiff += (end.idle - start.idle)
            totalDiff += (endTotal - startTotal)
        }

        const cpuPercentage = totalDiff > 0 ? 100 - Math.round((idleDiff / totalDiff) * 100) : 0

        // 2. Memory
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem

        // 3. Storage (Local & Cloud)
        let storageStats = {
            local: { total: 0, used: 0, free: 0, percentage: 0 },
            cloud: { used: 0, limit: 100 * 1024 * 1024 * 1024, percentage: 0 } // Default 100GB limit
        }

        // Local Storage
        try {
            // Use process.cwd() to target the drive where the app is running
            const drive = process.platform === 'win32' ? process.cwd().split(path.sep)[0] : '/'
            // fs.statfsSync works on Node 18+
            // On Windows, if drive letter is missing or context is weird, fallback to simpler check or ignore
            // For now, try detailed check
            const stats = fs.statfsSync(process.cwd())
            const total = stats.bsize * stats.blocks
            const free = stats.bsize * stats.bfree
            const used = total - free

            storageStats.local = {
                total,
                used,
                free,
                percentage: Math.round((used / total) * 100)
            }
        } catch (e) {
            console.error('Local storage check failed:', e)
        }

        // Cloud Storage (R2)
        try {
            const r2Stats = await getR2Stats()
            storageStats.cloud = {
                used: r2Stats.used,
                limit: 100 * 1024 * 1024 * 1024, // 100 GB Constant
                percentage: Math.round((r2Stats.used / (100 * 1024 * 1024 * 1024)) * 100)
            }
        } catch (e) {
            console.error('Cloud storage check failed:', e)
        }

        // Determine "Primary" storage stats to show in simple card (Max of both or just Local?)
        // The card expects single structure. We will send detailed structure and update frontend.
        // For backward compatibility, we set top-level storage to Local or whichever is higher?
        // Let's send a new 'storageDetails' field and keep 'storage' for compat but mapped to Local.

        const stats = {
            cpu: {
                usage: cpuPercentage,
                model: os.cpus()[0].model
            },
            memory: {
                total: totalMem, // Bytes
                used: usedMem,   // Bytes
                free: freeMem    // Bytes
            },
            storage: {
                // Backward compat (Show Local by default)
                size: storageStats.local.total,
                used: storageStats.local.used,
                use: storageStats.local.percentage
            },
            storageDetails: storageStats,
            uptime: os.uptime()
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error('Stats error:', error)
        return NextResponse.json({ error: 'Stats error' }, { status: 500 })
    }
}

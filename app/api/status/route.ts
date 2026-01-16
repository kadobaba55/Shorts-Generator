import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    const job = getJob(id)

    if (!job) {
        console.log(`[Status API] Job not found: ${id}`)
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Debug log when job is completed or has error
    if (job.status === 'completed' || job.status === 'error') {
        console.log(`[Status API] Job ${id}: status=${job.status}, hasResult=${!!job.result}`)
    }

    return NextResponse.json(job)
}

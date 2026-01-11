export interface Job {
    id: string
    type: 'download' | 'process' | 'analyze' | 'subtitle'
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'error'
    progress: number
    eta?: string
    message?: string
    result?: any
    error?: string
    startTime: number
    updatedAt: number
    queuePosition?: number
}

// Concurrency limits per job type
const CONCURRENCY_LIMITS: Record<Job['type'], number> = {
    download: 5,      // 5 simultaneous downloads
    process: 2,       // 2 simultaneous FFmpeg processes (CPU heavy)
    analyze: 3,       // 3 simultaneous analysis
    subtitle: 2,      // 2 Whisper at a time (CPU/RAM balanced for e2-medium)
}

// Global job store
const globalForJobs = global as unknown as {
    jobs: Map<string, Job>
    activeJobs: Map<Job['type'], Set<string>>
    waitingQueue: Map<Job['type'], string[]>
}

export const jobs = globalForJobs.jobs || new Map<string, Job>()
const activeJobs = globalForJobs.activeJobs || new Map<Job['type'], Set<string>>()
const waitingQueue = globalForJobs.waitingQueue || new Map<Job['type'], string[]>()

if (process.env.NODE_ENV !== 'production') {
    globalForJobs.jobs = jobs
    globalForJobs.activeJobs = activeJobs
    globalForJobs.waitingQueue = waitingQueue
}

// Initialize sets for each job type
for (const type of ['download', 'process', 'analyze', 'subtitle'] as Job['type'][]) {
    if (!activeJobs.has(type)) activeJobs.set(type, new Set())
    if (!waitingQueue.has(type)) waitingQueue.set(type, [])
}

export function createJob(type: Job['type']): Job {
    const id = Date.now().toString() + Math.random().toString(36).substring(7)
    const job: Job = {
        id,
        type,
        status: 'pending',
        progress: 0,
        startTime: Date.now(),
        updatedAt: Date.now()
    }
    jobs.set(id, job)
    return job
}

// Check if a new job can start immediately
export function canStartJob(type: Job['type']): boolean {
    const active = activeJobs.get(type)
    const limit = CONCURRENCY_LIMITS[type]
    return (active?.size || 0) < limit
}

// Add job to queue if limit is reached
export function enqueueJob(jobId: string, type: Job['type']): { canStart: boolean; position: number } {
    const active = activeJobs.get(type)!
    const queue = waitingQueue.get(type)!
    const limit = CONCURRENCY_LIMITS[type]

    if (active.size < limit) {
        // Can start immediately
        active.add(jobId)
        updateJob(jobId, { status: 'processing' })
        return { canStart: true, position: 0 }
    } else {
        // Add to queue
        queue.push(jobId)
        const position = queue.length
        updateJob(jobId, { status: 'queued', queuePosition: position })
        return { canStart: false, position }
    }
}

// Mark job as completed and start next in queue
export function completeJob(jobId: string, type: Job['type']) {
    const active = activeJobs.get(type)!
    const queue = waitingQueue.get(type)!

    active.delete(jobId)

    // Start next job in queue if exists
    if (queue.length > 0) {
        const nextJobId = queue.shift()!
        active.add(nextJobId)

        // Update queue positions for remaining jobs
        queue.forEach((id, index) => {
            updateJob(id, { queuePosition: index + 1 })
        })

        const nextJob = jobs.get(nextJobId)
        if (nextJob) {
            updateJob(nextJobId, { status: 'processing', queuePosition: undefined })
        }
        return nextJobId
    }
    return null
}

// Remove job from queue (on error or cancel)
export function removeFromQueue(jobId: string, type: Job['type']) {
    const active = activeJobs.get(type)!
    const queue = waitingQueue.get(type)!

    active.delete(jobId)
    const index = queue.indexOf(jobId)
    if (index > -1) {
        queue.splice(index, 1)
        // Update positions
        queue.forEach((id, i) => {
            updateJob(id, { queuePosition: i + 1 })
        })
    }
}

import { sendTelegramNotification, formatError } from './telegram'

export function updateJob(id: string, updates: Partial<Job>) {
    const job = jobs.get(id)
    if (job) {
        // Hata durumunda bildirim gönder
        if (updates.status === 'error' && updates.error && job.status !== 'error') {
            const msg = formatError(`Job Failed (${job.type})`, updates.error, { jobId: id })
            sendTelegramNotification(msg)
        }

        Object.assign(job, { ...updates, updatedAt: Date.now() })
        jobs.set(id, job)
    }
}

export function getJob(id: string) {
    return jobs.get(id)
}

// Get queue stats
export function getQueueStats() {
    const stats: Record<string, { active: number; waiting: number; limit: number }> = {}

    for (const type of ['download', 'process', 'analyze', 'subtitle'] as Job['type'][]) {
        stats[type] = {
            active: activeJobs.get(type)?.size || 0,
            waiting: waitingQueue.get(type)?.length || 0,
            limit: CONCURRENCY_LIMITS[type]
        }
    }

    return stats
}

// Clean up old jobs (older than 1 hour)
export function cleanupOldJobs() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const entries = Array.from(jobs.entries())
    for (const [id, job] of entries) {
        if (job.updatedAt < oneHourAgo && (job.status === 'completed' || job.status === 'error')) {
            jobs.delete(id)
        }
    }
}

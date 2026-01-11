export interface Job {
    id: string
    type: 'download' | 'process' | 'analyze' | 'subtitle'
    status: 'pending' | 'processing' | 'completed' | 'error'
    progress: number
    eta?: string // Format: "MM:SS" or "XXs"
    message?: string
    result?: any
    error?: string
    startTime: number
    updatedAt: number
}

// Global job store to persist across HMR in development
const globalForJobs = global as unknown as { jobs: Map<string, Job> }

export const jobs = globalForJobs.jobs || new Map<string, Job>()

if (process.env.NODE_ENV !== 'production') globalForJobs.jobs = jobs

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

export function updateJob(id: string, updates: Partial<Job>) {
    const job = jobs.get(id)
    if (job) {
        Object.assign(job, { ...updates, updatedAt: Date.now() })
        jobs.set(id, job)
    }
}

export function getJob(id: string) {
    return jobs.get(id)
}

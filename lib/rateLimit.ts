/**
 * Simple In-Memory Rate Limiter for Node.js environment.
 * Note: This works well in a single-instance container (like our Docker setup).
 * For serverless/distributed environments, Redis (e.g., Upstash) is recommended.
 */

interface RateLimitRecord {
    count: number
    lastReset: number
}

const store = new Map<string, RateLimitRecord>()

// Cleanup interval (evict old records every 10 mins)
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        const now = Date.now()
        store.forEach((record, key) => {
            // If record is older than 24 hours, delete it
            if (now - record.lastReset > 24 * 60 * 60 * 1000) {
                store.delete(key)
            }
        })
    }, 10 * 60 * 1000)
}

/**
 * Checks if the request is within the rate limit.
 * @param identifier Unique identifier (e.g., IP address or User ID)
 * @param limit Max requests allowed
 * @param windowMs Time window in milliseconds
 * @returns { success: boolean, remaining: number }
 */
export function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60 * 60 * 1000) {
    const now = Date.now()
    const record = store.get(identifier) || { count: 0, lastReset: now }

    // Reset window if passed
    if (now - record.lastReset > windowMs) {
        record.count = 0
        record.lastReset = now
    }

    // Check limit
    if (record.count >= limit) {
        return {
            success: false,
            remaining: 0,
            reset: record.lastReset + windowMs
        }
    }

    // Increment
    record.count++
    store.set(identifier, record)

    return {
        success: true,
        remaining: limit - record.count,
        reset: record.lastReset + windowMs
    }
}

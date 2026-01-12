/**
 * Guest Rate Limiting
 * IP bazlı günlük limit kontrolü (Redis olmadan, memory-based)
 */

interface GuestRecord {
    count: number
    resetAt: number
}

// In-memory store (sunucu restart'ında sıfırlanır, production için Redis önerilir)
const guestStore = new Map<string, GuestRecord>()

// Günlük limit (guest kullanıcılar için)
const DAILY_LIMIT = 1
const RESET_INTERVAL = 24 * 60 * 60 * 1000 // 24 saat

/**
 * Guest kullanıcı için rate limit kontrolü
 * @param ip - Kullanıcının IP adresi
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkGuestLimit(ip: string): {
    allowed: boolean
    remaining: number
    resetIn: number
} {
    const now = Date.now()
    const record = guestStore.get(ip)

    // Yeni kullanıcı veya süresi dolmuş
    if (!record || now >= record.resetAt) {
        guestStore.set(ip, {
            count: 0,
            resetAt: now + RESET_INTERVAL
        })
        return { allowed: true, remaining: DAILY_LIMIT, resetIn: RESET_INTERVAL }
    }

    // Limit kontrolü
    if (record.count >= DAILY_LIMIT) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: record.resetAt - now
        }
    }

    return {
        allowed: true,
        remaining: DAILY_LIMIT - record.count,
        resetIn: record.resetAt - now
    }
}

/**
 * Guest kullanıcı için kullanım sayısını artır
 * @param ip - Kullanıcının IP adresi
 */
export function incrementGuestUsage(ip: string): void {
    const record = guestStore.get(ip)
    if (record) {
        record.count += 1
        guestStore.set(ip, record)
    }
}

/**
 * Guest kullanıcı için kalan hakları getir
 * @param ip - Kullanıcının IP adresi
 */
export function getGuestRemaining(ip: string): number {
    const now = Date.now()
    const record = guestStore.get(ip)

    if (!record || now >= record.resetAt) {
        return DAILY_LIMIT
    }

    return Math.max(0, DAILY_LIMIT - record.count)
}

// Eski kayıtları temizle (memory leak önleme)
setInterval(() => {
    const now = Date.now()
    const entries = Array.from(guestStore.entries())
    for (const [ip, record] of entries) {
        if (now >= record.resetAt + RESET_INTERVAL) {
            guestStore.delete(ip)
        }
    }
}, 60 * 60 * 1000) // Her saat temizle

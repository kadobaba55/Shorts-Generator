/**
 * Tahmini Süre Hesaplama Utility Fonksiyonları
 * Video boyutuna ve işlem türüne göre ETA hesaplar
 */

/**
 * Saniye cinsinden süreyi okunabilir formata çevirir
 * @param seconds - Kalan süre (saniye)
 * @returns Formatlanmış süre string'i (örn: "~45s", "~2dk 30s")
 */
export function formatTimeRemaining(seconds: number): string {
    if (seconds <= 0) return 'bitmek üzere...'
    if (seconds < 60) {
        return `~${Math.ceil(seconds)}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.ceil(seconds % 60)
    if (remainingSeconds === 0) {
        return `~${minutes}dk`
    }
    return `~${minutes}dk ${remainingSeconds}s`
}

/**
 * Video indirme için tahmini süre hesaplar
 * Ortalama: ~1 dakika / 50MB video (yaklaşık 10 dakikalık video)
 * @param videoDurationSeconds - Video süresi (saniye)
 * @returns Tahmini indirme süresi (saniye)
 */
export function estimateDownloadTime(videoDurationSeconds: number): number {
    // 10 dakikalık video ~60 saniyede iner varsayımı
    // Video süresi / 10 * 60 = tahmini indirme süresi
    const baseTime = 15 // Minimum bekleme süresi
    const perMinuteTime = 6 // Her dakika video için ~6 saniye
    return baseTime + (videoDurationSeconds / 60) * perMinuteTime
}

/**
 * Klip render işlemi için tahmini süre hesaplar
 * FFmpeg ultrafast preset: ~5-10 saniye / klip
 * @param clipCount - Klip sayısı
 * @param clipDuration - Her klipin süresi (saniye)
 * @returns Tahmini render süresi (saniye)
 */
export function estimateRenderTime(clipCount: number, clipDuration: number): number {
    // Her klip için: base süre + klip uzunluğuna göre ek süre
    const basePerClip = 5 // Her klip için minimum 5 saniye
    const perSecondFactor = 0.3 // Her saniye klip için ~0.3 saniye işlem
    const faceDetectionTime = 3 // Yüz tespiti için ek süre

    return clipCount * (basePerClip + faceDetectionTime + (clipDuration * perSecondFactor))
}

/**
 * Altyazı ekleme işlemi için tahmini süre hesaplar
 * Whisper model'e göre değişir
 * @param clipDuration - Klip süresi (saniye)
 * @param model - Whisper model ('tiny' | 'base' | 'small' | 'medium')
 * @returns Tahmini altyazı süresi (saniye)
 */
export function estimateSubtitleTime(clipDuration: number, model: string): number {
    // Model bazında çarpan faktörleri
    const modelFactors: { [key: string]: number } = {
        'tiny': 0.5,   // En hızlı
        'base': 1.0,   // Orta
        'small': 2.0,  // Yavaş
        'medium': 4.0  // En yavaş
    }

    const factor = modelFactors[model] || 1.0
    const baseTime = 10 // Minimum süre
    const perSecond = 0.5 * factor // Her saniye video için

    // Ses çıkarma + transkripsiyon + video'ya yazma
    return baseTime + (clipDuration * perSecond) + 5
}

/**
 * AI video analizi için tahmini süre hesaplar
 * @param videoDuration - Video süresi (saniye)
 * @returns Tahmini analiz süresi (saniye)
 */
export function estimateAnalyzeTime(videoDuration: number): number {
    // Analiz genellikle hızlıdır, video süresine minimal bağımlılık
    const baseTime = 3
    const perMinute = 0.5 // Her dakika video için ~0.5 saniye
    return baseTime + (videoDuration / 60) * perMinute
}

/**
 * Progress yüzdesine göre kalan süreyi dinamik hesaplar
 * @param progress - Mevcut ilerleme (0-100)
 * @param totalEstimate - Toplam tahmini süre (saniye)
 * @param startTime - İşlem başlangıç zamanı (timestamp)
 * @returns Tahmini kalan süre (saniye)
 */
export function calculateRemainingTime(
    progress: number,
    totalEstimate: number,
    startTime?: number
): number {
    if (progress <= 0) return totalEstimate
    if (progress >= 100) return 0

    // Eğer başlangıç zamanı verilmişse, gerçek geçen süreye göre hesapla
    if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000
        const estimatedTotal = (elapsed / progress) * 100
        return Math.max(0, estimatedTotal - elapsed)
    }

    // Basit hesaplama: kalan yüzde * toplam süre / 100
    return (totalEstimate * (100 - progress)) / 100
}

/**
 * Seconds to mm:ss.ms format for video players
 */
export function formatTime(seconds: number): string {
    if (isNaN(seconds)) return "00:00.0"

    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 10)

    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms}`
}

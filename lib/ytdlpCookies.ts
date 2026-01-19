import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs'
import * as path from 'path'

const execAsync = promisify(exec)

// Cookie file path
const COOKIES_PATH = path.join(process.cwd(), 'youtube-cookies.txt')

/**
 * Check if cookies file exists and is valid
 */
export function hasCookies(): boolean {
    if (!fs.existsSync(COOKIES_PATH)) {
        return false
    }

    const stats = fs.statSync(COOKIES_PATH)
    const content = fs.readFileSync(COOKIES_PATH, 'utf-8')

    // Check if file has content and contains YouTube cookies
    return content.length > 100 && content.includes('youtube.com')
}

/**
 * Get cookie file age in days
 */
export function getCookieAge(): number {
    if (!fs.existsSync(COOKIES_PATH)) {
        return -1
    }

    const stats = fs.statSync(COOKIES_PATH)
    const ageMs = Date.now() - stats.mtimeMs
    return Math.floor(ageMs / (1000 * 60 * 60 * 24))
}

/**
 * Save cookies content to file
 */
export function saveCookies(cookiesContent: string): void {
    fs.writeFileSync(COOKIES_PATH, cookiesContent, 'utf-8')
}

/**
 * Download video using yt-dlp with cookies
 */
export async function downloadWithCookies(
    url: string,
    outputPath: string,
    onProgress?: (progress: number, message: string) => void
): Promise<{ success: boolean; error?: string; title?: string; duration?: number }> {

    if (!hasCookies()) {
        return { success: false, error: 'Cookie dosyası bulunamadı. Admin panelinden cookie yükleyin.' }
    }

    const cookieAge = getCookieAge()
    if (cookieAge > 14) {
        console.warn(`⚠️ Cookies are ${cookieAge} days old, may expire soon`)
    }

    try {
        onProgress?.(5, 'Video bilgisi alınıyor...')

        // Get video info first
        const infoCmd = `yt-dlp --cookies "${COOKIES_PATH}" --dump-json "${url}"`
        const { stdout: infoJson } = await execAsync(infoCmd, { maxBuffer: 50 * 1024 * 1024 })
        const videoInfo = JSON.parse(infoJson)

        const title = videoInfo.title || 'video'
        const duration = videoInfo.duration || 0

        console.log(`📹 Downloading: ${title} (${duration}s)`)
        onProgress?.(10, `İndiriliyor: ${title.substring(0, 30)}...`)

        // Download video
        const downloadCmd = `yt-dlp --cookies "${COOKIES_PATH}" -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`

        await execAsync(downloadCmd, {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 600000 // 10 minute timeout
        })

        // Verify file exists
        if (!fs.existsSync(outputPath)) {
            return { success: false, error: 'İndirilen dosya bulunamadı' }
        }

        const fileSize = fs.statSync(outputPath).size
        if (fileSize < 1000) {
            fs.unlinkSync(outputPath)
            return { success: false, error: 'İndirilen dosya çok küçük, muhtemelen hatalı' }
        }

        console.log(`✅ Download complete: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

        return { success: true, title, duration }

    } catch (error: any) {
        console.error('Download error:', error)

        // Check for specific error types
        const errorMsg = error.message || error.stderr || String(error)

        if (errorMsg.includes('Sign in to confirm') || errorMsg.includes('bot')) {
            return {
                success: false,
                error: 'Cookie\'ler geçersiz veya süresi dolmuş. Yeni cookie yükleyin.'
            }
        }

        if (errorMsg.includes('Video unavailable')) {
            return { success: false, error: 'Video bulunamadı veya özel' }
        }

        return { success: false, error: `İndirme hatası: ${errorMsg.substring(0, 200)}` }
    }
}

/**
 * Check if yt-dlp is installed
 */
export async function checkYtDlp(): Promise<boolean> {
    try {
        await execAsync('yt-dlp --version')
        return true
    } catch {
        return false
    }
}

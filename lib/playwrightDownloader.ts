import { chromium, Browser, Page } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const COOKIES_PATH = path.join(process.cwd(), 'youtube-cookies.txt')

interface DownloadResult {
    success: boolean
    error?: string
    title?: string
    duration?: number
    filePath?: string
}

/**
 * Parse Netscape cookie file format
 */
function parseCookieFile(cookieContent: string): any[] {
    const cookies: any[] = []
    const lines = cookieContent.split('\n')

    for (const line of lines) {
        if (line.startsWith('#') || line.trim() === '') continue

        const parts = line.split('\t')
        if (parts.length >= 7) {
            const [domain, , path, secure, expires, name, value] = parts
            cookies.push({
                name: name.trim(),
                value: value.trim(),
                domain: domain.startsWith('.') ? domain : `.${domain}`,
                path: path || '/',
                secure: secure.toLowerCase() === 'true',
                expires: parseInt(expires) || -1
            })
        }
    }

    return cookies
}

/**
 * Download YouTube video using Playwright (real browser)
 */
export async function downloadWithPlaywright(
    url: string,
    outputPath: string,
    onProgress?: (progress: number, message: string) => void
): Promise<DownloadResult> {
    let browser: Browser | null = null

    try {
        onProgress?.(5, 'Tarayıcı başlatılıyor...')

        // Launch headless browser
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        // Load cookies if available
        if (fs.existsSync(COOKIES_PATH)) {
            const cookieContent = fs.readFileSync(COOKIES_PATH, 'utf-8')
            const cookies = parseCookieFile(cookieContent)
            if (cookies.length > 0) {
                await context.addCookies(cookies)
                console.log(`🍪 Loaded ${cookies.length} cookies`)
            }
        }

        const page = await context.newPage()

        onProgress?.(10, 'YouTube sayfası açılıyor...')

        // Navigate to the video page
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })

        // Wait for video player to load
        await page.waitForSelector('video', { timeout: 30000 })

        onProgress?.(20, 'Video bilgisi alınıyor...')

        // Get video title
        const title = await page.evaluate(() => {
            const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata')
            return titleEl?.textContent?.trim() || 'video'
        })

        console.log(`📹 Video title: ${title}`)

        // Get video duration
        const duration = await page.evaluate(() => {
            const video = document.querySelector('video') as HTMLVideoElement
            return video?.duration || 0
        })

        onProgress?.(30, 'Video stream URL çıkarılıyor...')

        // Extract video source URL from the page
        const videoUrl = await page.evaluate(() => {
            const video = document.querySelector('video') as HTMLVideoElement
            if (video?.src) return video.src

            // Try to find in network requests or ytInitialPlayerResponse
            const scripts = Array.from(document.querySelectorAll('script'))
            for (const script of scripts) {
                const content = script.textContent || ''
                if (content.includes('ytInitialPlayerResponse')) {
                    const match = content.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/)
                    if (match) {
                        try {
                            const data = JSON.parse(match[1])
                            const formats = data.streamingData?.formats || []
                            const adaptiveFormats = data.streamingData?.adaptiveFormats || []
                            const allFormats = [...formats, ...adaptiveFormats]

                            // Find best mp4 format with both video and audio
                            const mp4Format = allFormats.find((f: any) =>
                                f.mimeType?.includes('video/mp4') &&
                                f.audioChannels &&
                                f.url
                            )

                            if (mp4Format?.url) return mp4Format.url

                            // Fallback: any format with URL
                            const anyFormat = allFormats.find((f: any) => f.url)
                            if (anyFormat?.url) return anyFormat.url
                        } catch (e) {
                            console.error('Parse error:', e)
                        }
                    }
                }
            }

            return null
        })

        if (!videoUrl) {
            // Try using yt-dlp with the browser's cookies
            await browser.close()
            browser = null

            onProgress?.(40, 'yt-dlp ile indiriliyor...')

            // Export cookies from context and use yt-dlp
            const cmd = `yt-dlp --cookies "${COOKIES_PATH}" -f "best[height<=1080]" -o "${outputPath}" "${url}"`
            await execAsync(cmd, { timeout: 600000 })

            if (fs.existsSync(outputPath)) {
                const fileSize = fs.statSync(outputPath).size
                if (fileSize > 1000) {
                    return { success: true, title, duration, filePath: outputPath }
                }
            }

            return { success: false, error: 'Video URL bulunamadı' }
        }

        onProgress?.(50, 'Video indiriliyor...')

        // Download video using fetch in browser context
        const videoBuffer = await page.evaluate(async (videoSrc) => {
            const response = await fetch(videoSrc)
            const buffer = await response.arrayBuffer()
            return Array.from(new Uint8Array(buffer))
        }, videoUrl)

        await browser.close()
        browser = null

        // Write to file
        fs.writeFileSync(outputPath, Buffer.from(videoBuffer))

        const fileSize = fs.statSync(outputPath).size
        console.log(`✅ Downloaded: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

        if (fileSize < 1000) {
            return { success: false, error: 'İndirilen dosya çok küçük' }
        }

        return { success: true, title, duration, filePath: outputPath }

    } catch (error: any) {
        console.error('Playwright download error:', error)
        return { success: false, error: error.message || 'Bilinmeyen hata' }
    } finally {
        if (browser) {
            await browser.close()
        }
    }
}

/**
 * Check if Playwright is installed
 */
export async function checkPlaywright(): Promise<boolean> {
    try {
        const browser = await chromium.launch({ headless: true })
        await browser.close()
        return true
    } catch {
        return false
    }
}

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

        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

        if (fs.existsSync(COOKIES_PATH)) {
            const cookieContent = fs.readFileSync(COOKIES_PATH, 'utf-8')
            const cookies = parseCookieFile(cookieContent)
            if (cookies.length > 0) {
                await context.addCookies(cookies)
                console.log(`🍪 Loaded ${cookies.length} cookies`)
            }
        }

        const page = await context.newPage()

        // Capture video streams from network
        let streamUrl: string | null = null
        page.on('response', (response) => {
            const url = response.url()
            if (url.includes('videoplayback') && !streamUrl) {
                const contentLength = response.headers()['content-length']
                if (contentLength && parseInt(contentLength) > 1000000) { // > 1MB
                    console.log('🎬 Found video stream:', url)
                    streamUrl = url
                }
            }
        })

        onProgress?.(10, 'YouTube sayfası açılıyor...')
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

        // Handle consent popup
        try {
            const consentSelectors = [
                'button[aria-label="Accept all"]',
                'button[aria-label="Reject all"]',
                '.eom-button-row button'
            ]
            for (const selector of consentSelectors) {
                if (await page.$(selector)) {
                    await page.click(selector)
                    console.log('🍪 Consent popup handled')
                    break
                }
            }
        } catch (e) {
            console.log('No consent popup found')
        }

        onProgress?.(20, 'Video oynatılıyor...')

        // Wait for video element and force play to trigger network request
        await page.waitForSelector('video', { timeout: 30000 })
        await page.evaluate(() => {
            const video = document.querySelector('video')
            if (video) {
                video.muted = true
                video.play()
                video.currentTime = 5 // skip beginning
            }
        })

        // Wait for network capture
        let attempts = 0
        while (!streamUrl && attempts < 20) {
            await new Promise(r => setTimeout(r, 500))
            attempts++
        }

        // Get updated title
        const title = await page.evaluate(() => {
            return document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata')?.textContent?.trim() || 'video'
        })

        const duration = await page.evaluate(() => {
            const video = document.querySelector('video')
            return video?.duration || 0
        })

        if (!streamUrl) {
            throw new Error('Video akışı yakalanamadı. Bot koruması veya ağ hatası.')
        }

        onProgress?.(50, 'Video indiriliyor...')
        console.log(`Downloading from stream: ${streamUrl}`)

        // Download using the captured stream URL
        const videoBuffer = await page.evaluate(async (videoSrc) => {
            const response = await fetch(videoSrc)
            const buffer = await response.arrayBuffer()
            return Array.from(new Uint8Array(buffer))
        }, streamUrl)

        await browser.close()
        browser = null

        fs.writeFileSync(outputPath, Buffer.from(videoBuffer as any))
        const fileSize = fs.statSync(outputPath).size
        console.log(`✅ Downloaded: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

        if (fileSize < 1000) {
            return { success: false, error: 'İndirilen dosya çok küçük' }
        }

        return { success: true, title, duration, filePath: outputPath }

    } catch (error: any) {
        console.error('Playwright download error:', error)
        // Screenshot for debug (saving to public to view if needed)
        if (browser) {
            try {
                // const pages = await browser.pages() // pages() is not on browser, but on contexts.
                // We don't have easy access to page object here in catch block if we lost reference.
                // Resetting logic is complex here.
            } catch { }
        }
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

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
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // Try to hide automation
                '--autoplay-policy=no-user-gesture-required'
            ]
        })

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            timezoneId: 'America/New_York'
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
            // Check for video playback URLs (googlevideo.com usually)
            if ((url.includes('videoplayback') || url.includes('.googlevideo.com/')) && !streamUrl) {
                // Check content length if available, or just assume it's the stream if it's a video type
                const headers = response.headers()
                const contentLength = headers['content-length']
                const contentType = headers['content-type']

                if ((contentLength && parseInt(contentLength) > 1000000) || (contentType && contentType.includes('video'))) {
                    console.log('🎬 Found video stream:', url)
                    streamUrl = url
                }
            }
        })

        onProgress?.(10, 'YouTube sayfası açılıyor...')
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

        // Handle consent popup (Generic and YouTube specific)
        try {
            const consentSelectors = [
                'button[aria-label="Accept all"]',
                'button[aria-label="Reject all"]',
                '.eom-button-row button',
                '#content .ytd-consent-bump-v2-lightbox button' // Example selector
            ]
            for (const selector of consentSelectors) {
                if (await page.$(selector)) {
                    await page.click(selector)
                    console.log('🍪 Consent popup handled via selector:', selector)
                    await page.waitForTimeout(1000)
                    break
                }
            }
        } catch (e) {
            console.log('No consent popup found or error handling it')
        }

        onProgress?.(20, 'Video oynatılıyor...')

        // Force playback interactions
        try {
            // Click "Play" if there's a large overlay button
            const playButtonSelectors = ['.ytp-large-play-button', 'button[aria-label="Play"]']
            for (const selector of playButtonSelectors) {
                if (await page.isVisible(selector)) {
                    await page.click(selector)
                    console.log('▶️ Clicked play button:', selector)
                    await page.waitForTimeout(500)
                }
            }

            // Programmatic play
            await page.waitForSelector('video', { timeout: 10000 })
            await page.evaluate(() => {
                const video = document.querySelector('video')
                if (video) {
                    video.muted = true
                    video.play().catch(e => console.error('Play error:', e))
                    video.currentTime = 0
                }
            })
        } catch (e) {
            console.warn('⚠️ Could not force playback:', e)
        }

        // Wait for network capture
        onProgress?.(30, 'Akış bekleniyor...')
        let attempts = 0
        while (!streamUrl && attempts < 30) { // Wait up to 15 seconds
            await new Promise(r => setTimeout(r, 500))
            attempts++
        }

        // Take debug screenshot if we failed or just for verification
        const debugPath = path.join(process.cwd(), 'public', 'debug-playwright.png')
        await page.screenshot({ path: debugPath, fullPage: false })
        console.log('📸 Debug screenshot saved to:', debugPath)

        if (!streamUrl) {
            throw new Error('Video akışı yakalanamadı. Lütfen public/debug-playwright.png dosyasını kontrol edin.')
        }

        // Get updated title and duration
        const title = await page.evaluate(() => {
            return document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata')?.textContent?.trim() || 'video'
        })

        const duration = await page.evaluate(() => {
            const video = document.querySelector('video')
            return video?.duration || 0
        })

        onProgress?.(50, 'Video indiriliyor...')
        console.log(`Downloading from stream: ${streamUrl}`)

        // Download using the captured stream URL
        // We use the page context to fetch so cookies/headers are preserved
        const videoBuffer = await page.evaluate(async (videoSrc) => {
            const response = await fetch(videoSrc)
            if (!response.ok) throw new Error('Network fetch failed: ' + response.status)
            const buffer = await response.arrayBuffer()
            return Array.from(new Uint8Array(buffer))
        }, streamUrl)

        await browser.close()
        browser = null

        fs.writeFileSync(outputPath, Buffer.from(videoBuffer as any))
        const fileSize = fs.statSync(outputPath).size
        console.log(`✅ Downloaded: ${(fileSize / 1024 / 1024).toFixed(2)} MB`)

        if (fileSize < 1000) {
            return { success: false, error: 'İndirilen dosya çok küçük (<1KB)' }
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

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Arguments: url, outputPath, cookiesPath
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node playwright-downloader.js <url> <outputPath> [cookiesPath]');
    process.exit(1);
}

const url = args[0];
const outputPath = args[1];
const cookiesPath = args[2];

// Netscape cookie parser
function parseCookieFile(cookieContent) {
    const cookies = [];
    const lines = cookieContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('#') || line.trim() === '') continue;
        const parts = line.split('\t');
        if (parts.length >= 7) {
            const [domain, , path, secure, expires, name, value] = parts;
            cookies.push({
                name: name.trim(),
                value: value.trim(),
                domain: domain.startsWith('.') ? domain : `.${domain}`,
                path: path || '/',
                secure: secure.toLowerCase() === 'true',
                expires: parseInt(expires) || -1
            });
        }
    }
    return cookies;
}

async function downloadVideo() {
    let browser = null;
    try {
        console.log('Starting Playwright downloader script...');

        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            timezoneId: 'America/New_York'
        });

        if (cookiesPath && fs.existsSync(cookiesPath)) {
            const cookieContent = fs.readFileSync(cookiesPath, 'utf-8');
            const cookies = parseCookieFile(cookieContent);
            if (cookies.length > 0) {
                await context.addCookies(cookies);
                console.log(`🍪 Loaded ${cookies.length} cookies`);
            }
        }

        const page = await context.newPage();
        let streamUrl = null;

        // Network Interception
        page.on('response', (response) => {
            const resUrl = response.url();

            // Check for potential video streams
            if (resUrl.includes('videoplayback') || resUrl.includes('.googlevideo.com/')) {
                const headers = response.headers();
                const contentLength = headers['content-length'];
                const contentType = headers['content-type'];

                // Log all candidates for debugging
                console.log(`📡 Network candidate: ${resUrl.substring(0, 100)}... [Type: ${contentType}, Size: ${contentLength}]`);

                if (streamUrl) return; // Already found one

                // Heuristic:
                // 1. Content-type starts with video/
                // 2. OR Content-length > 500KB (relaxed from 1MB)
                // 3. OR Transfer-encoding is chunked (no content-length)

                const isVideoType = contentType && contentType.startsWith('video/');
                const isLargeEnough = contentLength && parseInt(contentLength) > 500000;
                const isChunked = headers['transfer-encoding'] === 'chunked';

                if (isVideoType || isLargeEnough || isChunked) {
                    console.log('✅ Stream found:', resUrl);
                    streamUrl = resUrl;
                }
            }
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Handle Popups
        try {
            const consentSelectors = [
                'button[aria-label="Accept all"]',
                'button[aria-label="Reject all"]',
                '.eom-button-row button',
                '#content .ytd-consent-bump-v2-lightbox button',
                'yt-button-renderer#button' // Generic button often used in popups
            ];
            for (const selector of consentSelectors) {
                if (await page.$(selector)) {
                    await page.click(selector);
                    console.log('🍪 Consent popup handled');
                    await page.waitForTimeout(1000);
                    break;
                }
            }
        } catch (e) { /* ignore */ }

        // Start Playback - More Aggressive
        try {
            console.log('Attempting to force playback...');

            // 1. Click overlay buttons
            const playButtonSelectors = ['.ytp-large-play-button', 'button[aria-label="Play"]', '.ytp-play-button'];
            for (const selector of playButtonSelectors) {
                if (await page.isVisible(selector)) {
                    await page.click(selector);
                    await page.waitForTimeout(500);
                }
            }

            // 2. Click video element
            await page.waitForSelector('video', { timeout: 10000 });
            await page.click('video');

            // 3. Programmatic play
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    video.muted = true;
                    video.play().catch(e => console.error(e));
                    video.currentTime = 0;
                }
            });
        } catch (e) {
            console.warn('Playback force warning:', e.message);
        }

        // Wait for Stream
        let attempts = 0;
        // Wait up to 20 seconds, checking every 500ms
        while (!streamUrl && attempts < 40) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
            if (attempts % 10 === 0) console.log('Waiting for stream...');
        }

        if (!streamUrl) {
            const debugPath = path.join(process.cwd(), 'public', 'debug-script-playwright.png');
            await page.screenshot({ path: debugPath });
            console.error(`Stream not found. Screenshot saved to ${debugPath}`);
            throw new Error('Video stream URL not found');
        }

        // Metadata
        const title = await page.evaluate(() =>
            document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata')?.textContent?.trim() || 'video'
        );
        const duration = await page.evaluate(() =>
            document.querySelector('video')?.duration || 0
        );

        console.log(`Downloading stream: ${streamUrl}`);

        // Download in browser context
        const videoBuffer = await page.evaluate(async (src) => {
            const res = await fetch(src);
            if (!res.ok) throw new Error('Fetch failed: ' + res.status);
            const buf = await res.arrayBuffer();
            return Array.from(new Uint8Array(buf));
        }, streamUrl);

        fs.writeFileSync(outputPath, Buffer.from(videoBuffer));
        const fileSize = fs.statSync(outputPath).size;

        console.log(`Download complete. Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // Output result as JSON for the parent process
        console.log(JSON.stringify({
            success: true,
            title,
            duration,
            filePath: outputPath,
            fileSize
        }));

    } catch (error) {
        console.error('Script Error:', error);
        console.log(JSON.stringify({
            success: false,
            error: error.message
        }));
        process.exit(1);
    } finally {
        if (browser) await browser.close();
    }
}

downloadVideo();

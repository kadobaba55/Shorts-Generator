const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Helper to handle arguments (URL is required)
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error(JSON.stringify({ error: 'Usage: node playwright-downloader.js <url> [cookiePath]' }));
    process.exit(1);
}

const targetUrl = args[0];
const cookiePath = args[1]; // Optional

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

(async () => {
    let browser = null;
    try {
        // 1. Setup Playwright (Chromium) - Headless server configuration
        browser = await chromium.launch({
            headless: true, // Server-safe
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // Stealth
                '--autoplay-policy=no-user-gesture-required',
                '--disable-web-security'
            ]
        });

        // 2. Configure Context
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            deviceScaleFactor: 1
        });

        // Load cookies if provided
        if (cookiePath && fs.existsSync(cookiePath)) {
            try {
                const content = fs.readFileSync(cookiePath, 'utf-8');
                const cookies = parseCookieFile(content);
                if (cookies.length > 0) {
                    await context.addCookies(cookies);
                    // console.error(`[Debug] Loaded ${cookies.length} cookies`);
                }
            } catch (e) {
                // console.error(`[Debug] Failed to load cookies: ${e.message}`);
            }
        }

        const page = await context.newPage();

        // 3. Network Interception Logic
        const capturedStreams = {
            video: null,
            audio: null,
            expiresAt: null
        };

        // Intercept requests to find actual media streams
        page.on('request', request => {
            const url = request.url();

            // Filter for YouTube's video playback endpoints
            if (url.includes('videoplayback')) {
                const resourceType = request.resourceType();
                // We typically look for XHR/Fetch or Media types
                if (resourceType === 'xhr' || resourceType === 'fetch' || resourceType === 'media') {

                    const decodedUrl = decodeURIComponent(url);

                    // Capture Expiry if possible (expire=...)
                    if (!capturedStreams.expiresAt) {
                        const expireMatch = decodedUrl.match(/expire=(\d+)/);
                        if (expireMatch) {
                            capturedStreams.expiresAt = parseInt(expireMatch[1]);
                        }
                    }

                    // Strategically select best streams
                    if (decodedUrl.includes('mime=video/mp4') && !capturedStreams.video) {
                        capturedStreams.video = url;
                    }

                    if (decodedUrl.includes('mime=audio/mp4') && !capturedStreams.audio) {
                        capturedStreams.audio = url;
                    }
                }
            }
        });

        // 4. Navigate and Trigger Playback
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

        // Debug: Log Title
        const title = await page.title();
        // console.error(`[Debug] Page Title: ${title}`);

        // Attempt to bypass consent modals efficiently
        const consentSelectors = [
            'button[aria-label="Accept all"]',
            'button[aria-label="Agree to the use of cookies and other data for the purposes described"]',
            '.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--call-to-action',
            '#consent-bump button'
        ];

        for (const selector of consentSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn && await btn.isVisible()) {
                    await btn.click();
                    await page.waitForTimeout(1000);
                }
            } catch (e) { }
        }

        // Wait for video element
        try {
            await page.waitForSelector('video', { timeout: 20000 });
        } catch (e) {
            // console.error('[Debug] Video element not found');
        }

        // Programmatic play trigger (ensure SABR starts)
        await page.evaluate(async () => {
            const video = document.querySelector('video');
            if (video) {
                if (video.paused) {
                    await video.play();
                }
                video.currentTime = 0.1;
                video.volume = 0; // Mute to avoid audio issues on server
            }
        });

        // 5. Wait for streams to be captured
        let attempts = 0;
        const maxAttempts = 30; // 30 * 500ms = 15 seconds max wait after load

        while ((!capturedStreams.video || !capturedStreams.audio) && attempts < maxAttempts) {
            await page.waitForTimeout(500);
            attempts++;

            // Re-trigger play if still failing
            if (attempts % 5 === 0) {
                await page.evaluate(() => {
                    const video = document.querySelector('video');
                    if (video && video.paused) video.play();
                });
            }
        }

        // 6. Return Result
        if (capturedStreams.video) {
            // Success
            console.log(JSON.stringify({
                success: true,
                videoUrl: capturedStreams.video,
                audioUrl: capturedStreams.audio,
                expiresAt: capturedStreams.expiresAt
            }));
        } else {
            // Failure - Take Screenshot for debugging
            const debugPath = path.join(process.cwd(), 'public', 'error_screenshot.png');
            await page.screenshot({ path: debugPath, fullPage: true });

            // console.error(`[Debug] Screenshot saved to ${debugPath}`);

            console.log(JSON.stringify({
                success: false,
                error: 'Timeout waiting for media streams',
                details: `Title: ${title}. Screenshot saved to public/error_screenshot.png`
            }));
            process.exit(1);
        }

    } catch (error) {
        // Graceful Failure
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }));
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();

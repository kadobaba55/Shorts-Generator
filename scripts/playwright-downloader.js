const { chromium } = require('playwright');

// Helper to handle arguments (URL is required)
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error(JSON.stringify({ error: 'Usage: node playwright-downloader.js <url>' }));
    process.exit(1);
}

const targetUrl = args[0];

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

        // 2. Configure Context - Stealth & Mobile/Desktop Hybrid for best streams
        // Using a standard modern Desktop UA to avoid mobile redirection oddities but ensuring capability
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            deviceScaleFactor: 1
        });

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

                    // Decode URL params to check mime types
                    // URLs are often like: ...&mime=video%2Fmp4...
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
                        // Avoid low-quality partials if possible, but for SABR any valid stream is a win
                        capturedStreams.video = url;
                        // console.error('[Debug] Found Video Stream');
                    }

                    if (decodedUrl.includes('mime=audio/mp4') && !capturedStreams.audio) {
                        capturedStreams.audio = url;
                        // console.error('[Debug] Found Audio Stream');
                    }
                }
            }
        });

        // 4. Navigate and Trigger Playback
        // console.error(`[Debug] Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Attempt to bypass consent modals efficiently
        const consentSelectors = [
            'button[aria-label="Accept all"]',
            'button[aria-label="Agree to the use of cookies and other data for the purposes described"]',
            '.yt-spec-button-shape-next--filled.yt-spec-button-shape-next--call-to-action'
        ];

        for (const selector of consentSelectors) {
            try {
                const btn = await page.$(selector);
                if (btn && await btn.isVisible()) {
                    await btn.click();
                    await page.waitForTimeout(500); // Short grace period
                }
            } catch (e) { }
        }

        // Wait for video element
        await page.waitForSelector('video', { timeout: 15000 });

        // Programmatic play trigger (ensure SABR starts)
        await page.evaluate(async () => {
            const video = document.querySelector('video');
            if (video) {
                if (video.paused) {
                    await video.play();
                }
                // Force a seek to ensure buffering starts
                video.currentTime = 0.1;
            }
        });

        // 5. Wait for streams to be captured
        // We poll briefly until we have both or timeout
        let attempts = 0;
        const maxAttempts = 20; // 20 * 500ms = 10 seconds max wait after load

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
                audioUrl: capturedStreams.audio, // Might be null if embedded in video or missed
                expiresAt: capturedStreams.expiresAt
            }));
        } else {
            // Failure
            console.log(JSON.stringify({
                success: false,
                error: 'Timeout waiting for media streams',
                details: 'Could not intercept valid googlevideo.com/videoplayback requests'
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

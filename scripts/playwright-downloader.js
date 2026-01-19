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
            // Emulate iPad - Often forces standard MP4/HLS streams
            userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
            viewport: { width: 810, height: 1080 },
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
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
                // Ignore stats/logging calls
                if (resUrl.includes('generate_204')) return;

                // IGNORE UMP streams strictly
                if (resUrl.includes('vnd.yt-ump')) return;

                const headers = response.headers();
                const contentLength = headers['content-length'];
                const contentType = headers['content-type'] || '';
                const status = response.status();

                console.log(`📡 Candidate: ${resUrl.substring(0, 50)}... [${status}] [${contentType}]`);

                if (streamUrl) return;

                // Look for video/mp4
                const isVideo = contentType.startsWith('video/') && !contentType.includes('application/vnd');
                const isLarge = contentLength && parseInt(contentLength) > 1000000;

                if (isVideo || isLarge) {
                    console.log('✅ Stream found:', resUrl);
                    streamUrl = resUrl;
                }
            }
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // iPad Consent/Interactions
        try {
            await page.waitForTimeout(2000);

            // Try to click play if visible
            const playSelectors = ['.ytp-large-play-button', '#player', 'button[aria-label="Play"]'];
            for (const selector of playSelectors) {
                if (await page.isVisible(selector)) {
                    await page.click(selector);
                    console.log('Clicked play button');
                    await page.waitForTimeout(500);
                    break;
                }
            }

            // Programmatic play fallback
            await page.evaluate(() => {
                const videos = document.querySelectorAll('video');
                videos.forEach(v => { v.muted = true; v.play(); });
            });

        } catch (e) { /* ignore */ }

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

        console.log(`Downloading stream: ${streamUrl}`);

        // Initialize empty file
        fs.writeFileSync(outputPath, '');

        // Define a function to receive chunks from the browser
        // We accept base64 to ensure safe transfer of binary data across the bridge
        await page.exposeFunction('saveChunk', (base64Chunk) => {
            const buffer = Buffer.from(base64Chunk, 'base64');
            fs.appendFileSync(outputPath, buffer);
        });

        // Download in browser context (chunked using Fetch API + Streams)
        await page.evaluate(async (src) => {
            const res = await fetch(src);
            if (!res.ok) throw new Error('Fetch failed: ' + res.status);

            if (!res.body) throw new Error('No body in response');

            const reader = res.body.getReader();

            const chunkToBase64 = (buffer) => {
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary);
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                // value is Uint8Array
                // Convert to base64 to send to Node.js
                // Note: btoa might fail on huge chunks, but stream chunks are usually reasonable
                const base64 = chunkToBase64(value);
                await window.saveChunk(base64);
            }
        }, streamUrl);

        await browser.close();
        browser = null;

        const fileSize = fs.statSync(outputPath).size;
        console.log(`Download complete. Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        // Check file validity
        if (fileSize < 1000) {
            try {
                const smallContent = fs.readFileSync(outputPath, 'utf-8');
                console.log('⚠️ Small file content:', smallContent);
            } catch (e) { }
            throw new Error('Downloaded file is too small (<1KB)');
        }

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
        if (browser) await browser.close();
        process.exit(1);
    }
}

downloadVideo();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Arguments: url, outputPath, cookiesPath
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node playwright-downloader.js <url> <outputPath> [cookiesPath]');
    process.exit(1);
}

const url = args[0];
const outputPath = args[1];
const initialCookiesPath = args[2];

// Helper: Convert JSON cookies to Netscape format (required by yt-dlp)
function jsonToNetscape(cookies) {
    let netscape = '# Netscape HTTP Cookie File\n\n';
    cookies.forEach(cookie => {
        const domain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
        const includeSubdomains = cookie.domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const path = cookie.path;
        const secure = cookie.secure ? 'TRUE' : 'FALSE';
        const expiry = cookie.expires === -1 ? 0 : Math.round(cookie.expires);
        const name = cookie.name;
        const value = cookie.value;
        netscape += `${domain}\t${includeSubdomains}\t${path}\t${secure}\t${expiry}\t${name}\t${value}\n`;
    });
    return netscape;
}

// Netscape cookie parser (for importing initial cookies)
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

async function runHybridDownload() {
    let browser = null;
    let tempCookiePath = path.join(process.cwd(), `temp_cookies_${Date.now()}.txt`);

    try {
        console.log('🚀 Starting Hybrid Downloader (Playwright + yt-dlp)...');

        // 1. Launch Playwright to harvest fresh cookies
        browser = await chromium.launch({
            headless: true, // Use false if debugging is needed
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            locale: 'en-US'
        });

        // Load initial cookies if provided (to maintain login state)
        if (initialCookiesPath && fs.existsSync(initialCookiesPath)) {
            try {
                const content = fs.readFileSync(initialCookiesPath, 'utf-8');
                const initialCookies = parseCookieFile(content);
                if (initialCookies.length > 0) {
                    await context.addCookies(initialCookies);
                    console.log(`🍪 Loaded ${initialCookies.length} initial cookies.`);
                }
            } catch (e) {
                console.warn('⚠️ Failed to load initial cookies:', e.message);
            }
        }

        const page = await context.newPage();

        console.log(`� Navigating to ${url} to refresh cookies...`);
        // We go to the embed URL first as it's lighter, then the actual video if needed. 
        // Actually, going to the video page is better to trigger the specific consent/bot check for that video.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait a bit for background requests (PO-Token, etc.) to settle
        await page.waitForTimeout(5000);

        // Try to handle consent popup if it appears (simple version)
        try {
            const consentButton = await page.$('button[aria-label="Accept all"]');
            if (consentButton) {
                await consentButton.click();
                await page.waitForTimeout(2000);
            }
        } catch (e) { }

        // 2. Export Fresh Cookies
        const freshCookies = await context.cookies();
        const netscapeCookies = jsonToNetscape(freshCookies);
        fs.writeFileSync(tempCookiePath, netscapeCookies);
        console.log(`✅ Harvested ${freshCookies.length} fresh cookies. Saved to ${tempCookiePath}`);

        await browser.close();
        browser = null;

        // 3. Execute yt-dlp with fresh cookies
        console.log('⬇️ Starting yt-dlp download...');

        // Ensure outputPath directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // Construct yt-dlp command
        // -N 4: split into 4 threads (faster)
        // --cookies: use our fresh cookies

        // Check/Download local yt-dlp binary
        let ytDlpExecutable = 'yt-dlp'; // Default to global
        const isWin = process.platform === 'win32';
        const localBinName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
        const localPath = path.join(__dirname, localBinName);

        if (fs.existsSync(localPath)) {
            ytDlpExecutable = localPath;
            console.log(`Using local yt-dlp at: ${ytDlpExecutable}`);
        } else {
            console.log('Local yt-dlp not found. Attempting to download latest version...');
            try {
                const downloadUrl = isWin
                    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
                    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

                // Simple download using fetch (Node 18+)
                const res = await fetch(downloadUrl);
                if (!res.ok) throw new Error(`Failed to download yt-dlp: ${res.statusText}`);

                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                fs.writeFileSync(localPath, buffer);

                if (!isWin) {
                    fs.chmodSync(localPath, '755'); // Make executable on Linux
                }

                console.log(`✅ Downloaded yt-dlp to ${localPath}`);
                ytDlpExecutable = localPath;
            } catch (e) {
                console.error('⚠️ Failed to download local yt-dlp:', e.message);
                console.log('Falling back to global system yt-dlp');
            }
        }

        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

        const ytDlpArgs = [
            '--cookies', tempCookiePath,
            '--user-agent', userAgent,
            '--extractor-args', 'youtube:player_client=android',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', outputPath,
            '--no-playlist',
            '--force-overwrites',
            url
        ];

        const ytDlp = spawn(ytDlpExecutable, ytDlpArgs);

        let stderrOutput = '';

        ytDlp.stdout.on('data', (data) => {
            console.log(`[yt-dlp]: ${data.toString().trim()}`);
        });

        ytDlp.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            stderrOutput += msg + '\n';
            console.error(`[yt-dlp err]: ${msg}`);
        });

        ytDlp.on('close', (code) => {
            // Cleanup cookie file
            if (fs.existsSync(tempCookiePath)) {
                fs.unlinkSync(tempCookiePath);
            }

            if (code === 0) {
                console.log('✅ Download completed successfully!');

                // Validate file size
                try {
                    const stats = fs.statSync(outputPath);
                    console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

                    if (stats.size < 1000) {
                        console.log(JSON.stringify({ success: false, error: "Downloaded file is too small." }));
                        process.exit(1);
                    }

                    console.log(JSON.stringify({
                        success: true,
                        filePath: outputPath,
                        fileSize: stats.size
                    }));
                    process.exit(0);

                } catch (e) {
                    console.log(JSON.stringify({ success: false, error: "File not found after download." }));
                    process.exit(1);
                }
            } else {
                console.log(JSON.stringify({ success: false, error: `yt-dlp exited with code ${code}`, details: stderrOutput }));
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('❌ Script Error:', error);
        if (browser) await browser.close();
        if (fs.existsSync(tempCookiePath)) fs.unlinkSync(tempCookiePath);

        console.log(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
}

runHybridDownload();

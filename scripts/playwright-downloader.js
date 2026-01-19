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

        // Load initial cookies if provided
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

        // 🔍 Intercept PO Token & Visitor Data
        let poToken = null;
        let visitorData = null;

        await page.route('**/youtubei/v1/player*', async (route) => {
            const request = route.request();
            if (request.method() === 'POST') {
                try {
                    const postData = request.postDataJSON();

                    // Extract Visitor Data
                    if (postData.context?.client?.visitorData) {
                        visitorData = postData.context.client.visitorData;
                        console.log(`🔍 Intercepted Visitor Data from Network: ${visitorData.substring(0, 15)}...`);
                    }

                    // Extract PO Token (serviceIntegrityDimensions)
                    if (postData.serviceIntegrityDimensions?.poToken) {
                        poToken = postData.serviceIntegrityDimensions.poToken;
                        console.log(`💎 Intercepted PO Token from Network: ${poToken.substring(0, 15)}...`);
                    }
                } catch (e) { }
            }
            route.continue();
        });

        console.log(` Navigating to ${url} to refresh cookies & capture tokens...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait specifically for the player request to fire
        try {
            await page.waitForResponse(resp => resp.url().includes('/youtubei/v1/player'), { timeout: 10000 });
        } catch (e) {
            console.log('⚠️ Player request timeout, proceeding with what we have...');
        }

        await page.waitForTimeout(3000);

        try {
            const consentButton = await page.$('button[aria-label="Accept all"]');
            if (consentButton) await consentButton.click();
        } catch (e) { }

        // 2. Export Fresh Cookies
        const freshCookies = await context.cookies();
        const netscapeCookies = jsonToNetscape(freshCookies);
        fs.writeFileSync(tempCookiePath, netscapeCookies);
        console.log(`✅ Harvested ${freshCookies.length} fresh cookies.`);

        // 3. Extract PO Token (Proof of Origin)
        // This is critical for the "web" client to work without being blocked.
        // We try to find it in the ytcfg global object or intercept it.
        try {
            const result = await page.evaluate(() => {
                let token = null;
                let visitor = null;

                // Method 1: Check ytcfg
                if (window.ytcfg && window.ytcfg.data_) {
                    visitor = window.ytcfg.data_.VISITOR_DATA;
                    // PO Token is often buried or generated via potential BotGuard.
                    // Ideally we look for 'botguardResponse' or similar if exposed.
                }

                // Method 2: Check for known PO Token location in global scope (experimental)
                // Often standard web client doesn't expose it easily.
                // However, we can use the "visitorData" which is often enough with cookies.

                return { visitor };
            });

            if (result.visitor) {
                visitorData = result.visitor;
                console.log(`✅ Extracted Visitor Data: ${visitorData.substring(0, 10)}...`);
            }

            // NOTE: Full PO Token extraction requires deep hooking into the "botguard" script execution.
            // For now, we will try to rely on Cookies + UserAgent + Visitor Data.
            // If we really need PO Token, we might need to intercept the '/youtubei/v1/player' request 
            // and look at the 'serviceIntegrityDimensions' in the payload.

        } catch (e) {
            console.warn('⚠️ Failed to extract tokens:', e.message);
        }

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

        // Use Desktop User-Agent for standard web client
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

        // Construct Extractor Args
        let extractorArgs = 'youtube:player_client=web';

        if (visitorData) {
            extractorArgs += `;youtube:visitor_data=${visitorData}`;
        }

        if (poToken) {
            // Pass the extracted PO Token for the 'web' client
            extractorArgs += `;youtube:po_token=web+${poToken}`;
            console.log('✅ Applying PO Token to yt-dlp args');
        } else {
            console.log('⚠️ No PO Token found, proceeding with Cookies + Visitor Data only...');
        }

        const ytDlpArgs = [
            '--cookies', tempCookiePath,
            '--user-agent', userAgent,
            '--extractor-args', extractorArgs,
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

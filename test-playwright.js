const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testBrowser() {
    console.log('Starting Playwright test...');
    let browser = null;
    try {
        console.log('Launching browser...');
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched successfully.');

        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('Navigating to YouTube...');
        await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded' });
        console.log('Page title:', await page.title());

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'test-screenshot.png' });
        console.log('Screenshot saved to test-screenshot.png');

        await browser.close();
        console.log('Test completed successfully.');
    } catch (error) {
        console.error('Test FAILED:', error);
    } finally {
        if (browser) await browser.close();
    }
}

testBrowser();

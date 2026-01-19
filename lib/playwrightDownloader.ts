import * as path from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs'

const COOKIES_PATH = path.join(process.cwd(), 'youtube-cookies.txt')
const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'playwright-downloader.js')

interface DownloadResult {
    success: boolean
    error?: string
    title?: string
    duration?: number
    filePath?: string
}

export async function downloadWithPlaywright(
    url: string,
    outputPath: string,
    onProgress?: (progress: number, message: string) => void
): Promise<DownloadResult> {

    return new Promise((resolve) => {
        onProgress?.(5, 'Harici Playwright süreci başlatılıyor...')

        const child = spawn('node', [SCRIPT_PATH, url, outputPath, COOKIES_PATH])

        let stdoutData = ''
        let stderrData = ''

        child.stdout.on('data', (data) => {
            const output = data.toString()
            stdoutData += output
            console.log('[Playwright Script]:', output.trim())

            // Try to parse progress messages from standard logs if possible, 
            // or just rely on the final JSON output.
            if (output.includes('Navigating')) onProgress?.(10, 'YouTube açılıyor...')
            if (output.includes('Found video stream')) onProgress?.(30, 'Akış bulundu...')
            if (output.includes('Downloading stream')) onProgress?.(50, 'İndiriliyor...')
        })

        child.stderr.on('data', (data) => {
            const output = data.toString()
            stderrData += output
            console.error('[Playwright Script Error]:', output.trim())
        })

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`Playwright script exited with code ${code}`)
                // Try to find JSON output even in failure
            }

            // Parse the last line or find JSON in stdout
            try {
                const lines = stdoutData.trim().split('\n')
                // Look for the JSON result in the last few lines
                let result: DownloadResult | null = null
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const parsed = JSON.parse(lines[i])
                        if (parsed.success !== undefined) {
                            result = parsed
                            break
                        }
                    } catch { }
                }

                if (result) {
                    resolve(result)
                } else {
                    resolve({
                        success: false,
                        error: `İşlem başarısız (Exit code: ${code}). Hata: ${stderrData.slice(-200)}`
                    })
                }
            } catch (e) {
                resolve({ success: false, error: 'Çıktı okunamadı: ' + e.message })
            }
        })
    })
}

export async function checkPlaywright(): Promise<boolean> {
    return fs.existsSync(SCRIPT_PATH)
}

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'output')
const TEMP_DIR = path.join(process.cwd(), 'temp')

interface SubtitleRequest {
    videoPath: string
    language?: string
    style?: 'classic' | 'neon' | 'box'
    model?: 'tiny' | 'base' | 'small' | 'medium'
    addEmojis?: boolean
    highlightKeywords?: boolean
}

// Ensure directories exist
function ensureDirectories() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true })
    }
}

// Helper function to add emojis based on context
function addEmojisToText(text: string): string {
    const emojiMap: { [key: string]: string } = {
        'harika': '🎉', 'güzel': '✨', 'mükemmel': '🔥', 'iyi': '👍',
        'kötü': '😞', 'üzgün': '😢', 'mutlu': '😊', 'sevgi': '❤️',
        'para': '💰', 'başarı': '🏆', 'hedef': '🎯', 'güç': '💪',
        'fikir': '💡', 'önemli': '⚠️', 'dikkat': '⚡', 'hızlı': '🚀'
    }

    let result = text
    for (const [word, emoji] of Object.entries(emojiMap)) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi')
        result = result.replace(regex, `$& ${emoji}`)
    }
    return result
}

// Helper function to highlight important keywords
function highlightKeywordsInText(text: string): string {
    const keywords = ['önemli', 'dikkat', 'mutlaka', 'kesinlikle', 'asla', 'her zaman']
    let result = text

    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        result = result.replace(regex, match => match.toUpperCase())
    })

    return result
}

// Helper to convert time in seconds to SRT format (00:00:00,000)
function secondsToSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

export async function POST(request: NextRequest) {
    console.log('=== Subtitle Burn API Called ===')

    try {
        let body: any
        try {
            body = await request.json()
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const {
            videoPath,
            segments, // Expecting array of {id, start, end, text}
            style = 'viral',
            font = 'Impact',
            primaryColor = '#00FFFF',
            addEmojis = false,
            highlightKeywords = false
        } = body

        if (!videoPath) {
            return NextResponse.json({ error: 'Video path required' }, { status: 400 })
        }

        if (!segments || !Array.isArray(segments)) {
            return NextResponse.json({ error: 'Segments array required' }, { status: 400 })
        }

        // Ensure directories exist
        ensureDirectories()

        const inputPath = path.join(process.cwd(), 'public', videoPath)
        if (!fs.existsSync(inputPath)) {
            return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
        }

        const outputId = Date.now().toString()
        const srtPath = path.join(TEMP_DIR, `${outputId}.srt`)
        const outputPath = path.join(OUTPUT_DIR, `${outputId}_subtitled.mp4`)

        // Step 1: Generate SRT file from JSON segments
        console.log(`Generating SRT with ${segments.length} segments...`)
        let srtContent = ''

        segments.forEach((seg: any, index: number) => {
            let text = seg.text

            // Apply text processing if requested (could be done in frontend, but here is safe too)
            if (addEmojis) text = addEmojisToText(text)
            if (highlightKeywords) text = highlightKeywordsInText(text)

            srtContent += `${index + 1}\n`
            srtContent += `${secondsToSrtTime(seg.start)} --> ${secondsToSrtTime(seg.end)}\n`
            srtContent += `${text}\n\n`
        })

        fs.writeFileSync(srtPath, srtContent, 'utf-8')
        console.log('SRT generated at:', srtPath)

        // Step 2: Convert hex color to ASS format (BBGGRR with &H prefix)
        const hexToAss = (hex: string): string => {
            const clean = hex.replace('#', '')
            const r = clean.substring(0, 2)
            const g = clean.substring(2, 4)
            const b = clean.substring(4, 6)
            return `&H${b}${g}${r}&`
        }

        // Build custom style from frontend parameters
        const primaryColorAss = hexToAss(primaryColor)
        const customStyle = `FontName=${font},FontSize=32,PrimaryColour=${primaryColorAss},OutlineColour=&H000000&,Outline=4,Shadow=3,Bold=1,Alignment=2,MarginV=60`

        // Fallback to preset styles
        const styles: { [key: string]: string } = {
            'classic': 'FontName=Impact,FontSize=28,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,Outline=3,Shadow=2,Bold=1,Alignment=2,MarginV=50',
            'neon': 'FontName=Arial Black,FontSize=30,PrimaryColour=&HFF00FF&,SecondaryColour=&HFFFF00&,OutlineColour=&H000000&,Outline=4,Shadow=0,Bold=1,Alignment=2,MarginV=50',
            'box': 'FontName=Roboto,FontSize=26,PrimaryColour=&HFFFFFF&,BackColour=&H80000000&,Outline=0,Shadow=0,BorderStyle=4,Bold=1,Alignment=2,MarginV=50',
            'viral': customStyle,  // Use custom style for viral
            'minimal': 'FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H404040&,Outline=2,Shadow=1,Alignment=2,MarginV=40',
            'karaoke': 'FontName=Comic Sans MS,FontSize=28,PrimaryColour=&H00D7FF&,OutlineColour=&H000000&,Outline=3,Shadow=2,Bold=1,Alignment=2,MarginV=50'
        }

        // If custom font/color provided, always use custom style
        const subtitleStyle = (font !== 'Impact' || primaryColor !== '#00FFFF') ? customStyle : (styles[style] || styles['viral'])

        // Windows path escape specifically for FFmpeg subtitles filter
        // We need to use forward slashes and escape colon
        const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:')

        const burnSubsCmd = `ffmpeg -y -i "${inputPath}" -vf "subtitles='${escapedSrtPath}':force_style='${subtitleStyle}'" -c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}"`

        console.log('Burning subtitles...')
        await execAsync(burnSubsCmd, { timeout: 300000 }) // 5 min timeout

        // Cleanup
        try { fs.unlinkSync(srtPath) } catch (e) { }

        return NextResponse.json({
            success: true,
            outputPath: `/output/${outputId}_subtitled.mp4`,
            message: 'Altyazı başarıyla eklendi'
        })

    } catch (error: any) {
        console.error('Subtitle Burn Error:', error)
        return NextResponse.json({
            error: error.message || 'Altyazı işleme hatası',
            details: error.stack
        }, { status: 500 })
    }
}

// GET endpoint for transcription only (without burning)
export async function GET(req: NextRequest) {
    // Rate Limit Check (Daha esnek: Saatte 20 işlem)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    const rate = checkRateLimit(ip, 20, 60 * 60 * 1000)

    if (!rate.success) {
        return NextResponse.json(
            { error: 'İşlem limitiniz doldu. Lütfen bekleyin.' },
            { status: 429 }
        )
    }

    try {
        const videoPath = req.nextUrl.searchParams.get('videoPath')
        const language = req.nextUrl.searchParams.get('language') || 'tr'
        const model = req.nextUrl.searchParams.get('model') || 'tiny'

        if (!videoPath) {
            return NextResponse.json({ error: 'Video path required' }, { status: 400 })
        }

        ensureDirectories()

        const inputPath = path.join(process.cwd(), 'public', videoPath)

        if (!fs.existsSync(inputPath)) {
            return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
        }

        const outputId = Date.now().toString()
        const audioPath = path.join(TEMP_DIR, `${outputId}.wav`)
        const srtPath = path.join(TEMP_DIR, `${outputId}.srt`)

        // Extract audio
        const extractCmd = `ffmpeg -y -i "${inputPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`
        await execAsync(extractCmd, { timeout: 120000 })

        // Transcribe
        const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe.py')
        const whisperCmd = `python "${scriptPath}" "${audioPath}" --model ${model} --language ${language} --output "${srtPath}"`
        const { stdout } = await execAsync(whisperCmd, { timeout: 600000, maxBuffer: 50 * 1024 * 1024 })

        // Read transcription
        let srtContent = ''
        if (fs.existsSync(srtPath)) {
            srtContent = fs.readFileSync(srtPath, 'utf-8')
            fs.unlinkSync(srtPath)
        }

        // Cleanup
        try { fs.unlinkSync(audioPath) } catch { }

        return NextResponse.json({
            success: true,
            transcription: srtContent,
            whisperOutput: stdout
        })

    } catch (error: any) {
        console.error('Transcription error:', error)
        return NextResponse.json({
            error: error.message || 'Transkripsiyon hatası'
        }, { status: 500 })
    }
}

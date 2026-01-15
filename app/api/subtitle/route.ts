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

        // DEBUG: Log incoming request data
        console.log('=== SUBTITLE API RECEIVED ===')
        console.log('Video Path:', videoPath)
        console.log('Style:', style, 'Font:', font, 'Color:', primaryColor)
        console.log('Segments count:', segments?.length)
        if (segments && segments.length > 0) {
            console.log('First 3 segments:')
            segments.slice(0, 3).forEach((s: any, i: number) => {
                console.log(`  ${i + 1}. [${s.start?.toFixed(2)}s - ${s.end?.toFixed(2)}s] "${s.text}"`)
            })
        }
        console.log('=============================')

        if (!videoPath) {
            return NextResponse.json({ error: 'Video path required' }, { status: 400 })
        }

        if (!segments || !Array.isArray(segments)) {
            return NextResponse.json({ error: 'Segments array required' }, { status: 400 })
        }

        // Ensure directories exist
        ensureDirectories()

        // Handle Remote URL (R2) vs Local File
        let inputPath = videoPath
        const isRemote = videoPath.startsWith('http')

        if (!isRemote) {
            inputPath = path.join(process.cwd(), 'public', videoPath)
            if (!fs.existsSync(inputPath)) {
                return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
            }
        }

        const outputId = Date.now().toString()
        const srtPath = path.join(TEMP_DIR, `${outputId}.srt`)
        const outputPath = path.join(OUTPUT_DIR, `${outputId}_subtitled.mp4`)

        // Step 1: Sort segments by start time and fix overlapping times
        const sortedSegments = [...segments].sort((a: any, b: any) => a.start - b.start)

        // Fix overlapping segments - ensure each segment ends before next one starts
        for (let i = 0; i < sortedSegments.length - 1; i++) {
            const current = sortedSegments[i]
            const next = sortedSegments[i + 1]

            // If current segment's end time overlaps with next segment's start time
            if (current.end >= next.start) {
                // Set current end to slightly before next start (50ms gap)
                current.end = Math.max(current.start + 0.1, next.start - 0.05)
            }
        }

        // Step 2: Generate SRT file from fixed segments
        console.log(`Generating SRT with ${sortedSegments.length} segments...`)
        let srtContent = ''

        sortedSegments.forEach((seg: any, index: number) => {
            let text = seg.text

            // Apply text processing if requested
            if (addEmojis) text = addEmojisToText(text)
            if (highlightKeywords) text = highlightKeywordsInText(text)

            srtContent += `${index + 1}\n`
            srtContent += `${secondsToSrtTime(seg.start)} --> ${secondsToSrtTime(seg.end)}\n`
            srtContent += `${text}\n\n`

            // Debug log first few segments
            if (index < 5) {
                console.log(`Segment ${index + 1}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s: "${text}"`)
            }
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

        // Import presets to get full style info
        const { SUBTITLE_PRESETS } = await import('@/lib/subtitlePresets')
        const preset = SUBTITLE_PRESETS.find(p => p.id === style)

        // Build ASS style from preset or custom parameters
        const buildAssStyle = () => {
            const fontName = font || preset?.font || 'Impact'
            const fontSize = preset?.fontSize || 32
            const color = hexToAss(primaryColor || preset?.primaryColor || '#00FFFF')
            const outlineColor = hexToAss(preset?.outlineColor || '#000000')

            // Determine if italic should be applied (some presets may use it)
            const italic = 1 // Enable italic for more stylish look matching preview
            const bold = 1

            // Shadow settings
            const shadow = preset?.shadowEnabled ? Math.ceil(preset.shadowBlur / 2) : 3
            const outline = 3

            // Background box style (BorderStyle=4 with BackColour)
            let bgStyle = ''
            if (preset?.bgEnabled && preset.bgOpacity > 0) {
                // Convert opacity to hex alpha (00-FF, inverted for ASS)
                const alpha = Math.round((1 - preset.bgOpacity) * 255).toString(16).padStart(2, '0').toUpperCase()
                const bgColor = hexToAss(preset.bgColor || '#000000').replace('&H', `&H${alpha}`)
                bgStyle = `,BorderStyle=4,BackColour=${bgColor}`
            }

            return `FontName=${fontName},FontSize=${fontSize},PrimaryColour=${color},OutlineColour=${outlineColor},Outline=${outline},Shadow=${shadow},Bold=${bold},Italic=${italic},Alignment=2,MarginV=60${bgStyle}`
        }

        const subtitleStyle = buildAssStyle()

        // Check for user session to improved Guest Mode logic
        const { getServerSession } = await import("next-auth")
        const { authOptions } = await import("@/lib/auth")
        const session = await getServerSession(authOptions)

        // Apply watermark for FREE plan users
        // Since we enforced login, everyone has a session, but we check plan
        const isFreePlan = session?.user && (session.user as any).subscriptionPlan === 'FREE'

        // Windows path escape specifically for FFmpeg subtitles filter
        // We need to use forward slashes and escape colon
        const escapedSrtPath = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:')

        // Watermark filter setup
        let vfFilter = `subtitles='${escapedSrtPath}':force_style='${subtitleStyle}'`

        if (isFreePlan) {
            // Add watermark for guests/free users
            // drawtext=text='KADOSTUDIO DEMO':x=(w-text_w)/2:y=h-50:fontsize=24:fontcolor=white@0.5:box=1:boxcolor=black@0.5
            const watermarkText = 'KADOSTUDIO | FREE VERSION'
            const watermarkFilter = `drawtext=text='${watermarkText}':x=(w-text_w)/2:y=h-60:fontsize=36:fontcolor=white@0.8:box=1:boxcolor=black@0.6:boxborderw=10`
            vfFilter = `${vfFilter},${watermarkFilter}`
        }

        const burnSubsCmd = `ffmpeg -y -i "${inputPath}" -vf "${vfFilter}" -c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}"`

        console.log('Burning subtitles...')
        await execAsync(burnSubsCmd, { timeout: 300000 }) // 5 min timeout

        // Cleanup SRT file
        try { fs.unlinkSync(srtPath) } catch (e) { }

        // Upload subtitled video to R2 for consistent access
        console.log('Uploading subtitled video to storage...')
        const { handleClipStorage } = await import('@/lib/storage')
        const r2Key = `subtitled/${outputId}_subtitled.mp4`
        const publicUrl = await handleClipStorage(outputPath, r2Key)

        console.log('✅ Subtitled video saved:', publicUrl)

        return NextResponse.json({
            success: true,
            outputPath: publicUrl, // R2 URL (or local path in local mode)
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

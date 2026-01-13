import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
    const filePath = request.nextUrl.searchParams.get('path')

    if (!filePath) {
        return NextResponse.json(
            { error: 'File path required' },
            { status: 400 }
        )
    }

    const fullPath = path.join(process.cwd(), 'public', filePath)

    if (!fs.existsSync(fullPath)) {
        return NextResponse.json(
            { error: 'File not found' },
            { status: 404 }
        )
    }

    // Check if user is logged in
    const session = await getServerSession(authOptions)

    // Check if user is on Free Plan
    // Since login is mandatory, we just check the plan
    const isFreePlan = (session?.user as any)?.subscriptionPlan === 'FREE'

    // If Free Plan, add watermark
    if (isFreePlan) {
        const watermarkPath = path.join(process.cwd(), 'public', 'watermark.png')

        // Check if watermark exists
        if (!fs.existsSync(watermarkPath)) {
            console.warn('Watermark file not found, serving original video')
            return serveFile(fullPath)
        }

        try {
            // Create temp output path for watermarked video
            const outputDir = path.join(process.cwd(), 'public', 'temp')
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true })
            }

            const outputPath = path.join(outputDir, `watermarked_${Date.now()}.mp4`)

            // FFmpeg command to add watermark (bottom-right corner, 20% size, 50% opacity)
            const ffmpegCmd = `ffmpeg -y -i "${fullPath}" -i "${watermarkPath}" -filter_complex "[1:v]scale=iw*0.2:-1,format=rgba,colorchannelmixer=aa=0.5[watermark];[0:v][watermark]overlay=W-w-20:H-h-20" -c:a copy -preset ultrafast "${outputPath}"`

            await execAsync(ffmpegCmd)

            // Serve watermarked file
            const response = serveFile(outputPath, path.basename(fullPath))

            // Schedule cleanup of temp file after 1 minute
            setTimeout(() => {
                try {
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath)
                    }
                } catch (e) {
                    console.error('Failed to cleanup temp file:', e)
                }
            }, 60000)

            return response
        } catch (error) {
            console.error('Watermark error:', error)
            // Fallback to original if watermarking fails
            return serveFile(fullPath)
        }
    }

    // Logged-in user: serve original file without watermark
    return serveFile(fullPath)
}

function serveFile(fullPath: string, customFileName?: string) {
    const fileBuffer = fs.readFileSync(fullPath)
    const fileName = customFileName || path.basename(fullPath)

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': fileBuffer.length.toString()
        }
    })
}

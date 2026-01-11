import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

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

    const fileBuffer = fs.readFileSync(fullPath)
    const fileName = path.basename(fullPath)

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': fileBuffer.length.toString()
        }
    })
}

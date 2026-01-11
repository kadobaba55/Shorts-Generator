import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)

    // Sadece admin
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Dosyayı kök dizine kaydet
        const filePath = path.join(process.cwd(), 'cookies.txt')
        fs.writeFileSync(filePath, buffer)

        return NextResponse.json({ success: true, message: 'Cookies güncellendi' })

    } catch (error: any) {
        console.error('Cookie upload error:', error)
        return NextResponse.json({ error: 'Upload başarısız' }, { status: 500 })
    }
}

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = path.join(process.cwd(), 'cookies.txt')
    const exists = fs.existsSync(filePath)

    let stats = null
    if (exists) {
        const fileStats = fs.statSync(filePath)
        stats = {
            mtime: fileStats.mtime,
            size: fileStats.size
        }
    }

    return NextResponse.json({ exists, stats })
}

export async function DELETE() {
    const session = await getServerSession(authOptions)

    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = path.join(process.cwd(), 'cookies.txt')
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }

    return NextResponse.json({ success: true })
}

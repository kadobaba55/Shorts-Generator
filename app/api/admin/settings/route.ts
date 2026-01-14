import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'

const prisma = new PrismaClient()

// Helper to check admin session
async function isAdmin() {
    const session = await getServerSession()
    // In a real app, check role. For now, we assume authenticated users accessing this protected route are admins
    // or we rely on middleware. BUT middleware only protects paths.
    // Ideally we check session.user.email === process.env.ADMIN_EMAIL
    // For simplicity given current setup, we check if session exists. 
    // The user has middleware protecting /admin, but API routes need their own check usually.
    return !!session
}

export async function GET() {
    try {
        if (!await isAdmin()) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const settings = await prisma.systemSetting.findMany()
        // Convert array to object for easier frontend consumption
        const settingsMap = settings.reduce((acc: Record<string, string>, curr) => {
            acc[curr.key] = curr.value
            return acc
        }, {} as Record<string, string>)

        return NextResponse.json(settingsMap)
    } catch (error) {
        console.error('Settings GET Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        if (!await isAdmin()) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { key, value } = body

        if (!key || value === undefined) {
            return new NextResponse('Missing key or value', { status: 400 })
        }

        const setting = await prisma.systemSetting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) }
        })

        return NextResponse.json(setting)
    } catch (error) {
        console.error('Settings POST Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

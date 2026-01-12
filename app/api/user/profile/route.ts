import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { name } = body

        if (!name || name.trim().length < 2) {
            return NextResponse.json({ error: 'İsim en az 2 karakter olmalıdır.' }, { status: 400 })
        }

        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: { name: name.trim() },
        })

        return NextResponse.json({ success: true, user: updatedUser })

    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ error: 'Profil güncellenemedi.' }, { status: 500 })
    }
}

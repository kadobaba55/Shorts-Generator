import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // @ts-ignore
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { userId, amount, type } = body // type: 'add' or 'set' (not implementing set yet, assuming add/remove)

        if (!userId || typeof amount !== 'number') {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 })
        }

        // Update tokens
        // Create transaction record
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { tokens: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    amount,
                    type: 'ADMIN_ADJUSTMENT'
                }
            })
        ])

        return NextResponse.json({ success: true })

    } catch (error) {
        return NextResponse.json({ error: "Failed to update tokens" }, { status: 500 })
    }
}

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { tokens: true }
    })

    return NextResponse.json({ tokens: user?.tokens || 0 })
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    try {
        const { amount, type } = await req.json()

        // Create transaction
        await prisma.transaction.create({
            data: {
                userId: session.user.id,
                amount: amount,
                type: type || 'BONUS'
            }
        })

        // Update user tokens
        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: { tokens: { increment: amount } }
        })

        return NextResponse.json({
            message: "Tokens added",
            tokens: updatedUser.tokens
        })
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 })
    }
}

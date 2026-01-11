import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // @ts-ignore
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 })
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                tokens: true,
                subscriptionPlan: true,
                subscriptionEnd: true,
                createdAt: true,
                transactions: {
                    select: { id: true }, // Just to count
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const usersWithStats = users.map((user: any) => ({
            ...user,
            usageCount: user.transactions.length
        }))

        return NextResponse.json({ users: usersWithStats })

    } catch (error) {
        console.error("Admin API Error:", error)
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // @ts-ignore
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 })
        }

        const { userId } = await req.json()

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        // Prevent self-deletion
        // @ts-ignore
        if (userId === session.user.id) {
            return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
        }

        // Delete related transactions first (if not cascading)
        await prisma.transaction.deleteMany({
            where: { userId: userId }
        })

        // Delete user
        await prisma.user.delete({
            where: { id: userId }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Delete user error:", error)
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }
}

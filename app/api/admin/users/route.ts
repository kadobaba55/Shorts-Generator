import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

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
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // @ts-ignore
        if (session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 })
        }

        const body = await req.json()
        const { id, action, tokens, subscriptionPlan, role } = body

        if (!id) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 })
        }

        // Handle specific actions like block/unblock
        if (action === 'block') {
            const updated = await prisma.user.update({
                where: { id },
                data: { subscriptionPlan: 'BLOCKED' }
            })
            return NextResponse.json({ success: true, user: updated })
        }

        if (action === 'unblock') {
            const updated = await prisma.user.update({
                where: { id },
                data: { subscriptionPlan: 'FREE' } // Default to FREE on unblock
            })
            return NextResponse.json({ success: true, user: updated })
        }

        // Handle general update
        const updateData: any = {}
        if (tokens !== undefined) updateData.tokens = Number(tokens)
        if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan
        // if (role !== undefined) updateData.role = role // If we want to support role change

        if (Object.keys(updateData).length > 0) {
            const updated = await prisma.user.update({
                where: { id },
                data: updateData
            })
            return NextResponse.json({ success: true, user: updated })
        }

        return NextResponse.json({ error: "No update data provided" }, { status: 400 })

    } catch (error) {
        console.error("Update user error:", error)
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }
}

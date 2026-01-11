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

        // Transform data to include usage count
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

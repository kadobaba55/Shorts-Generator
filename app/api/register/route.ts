import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
    try {
        const { email, password, name } = await req.json()

        if (!email || !password) {
            return NextResponse.json(
                { message: "Email ve şifre gerekli" },
                { status: 400 }
            )
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { message: "Bu email zaten kayıtlı" },
                { status: 400 }
            )
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                tokens: 5 // Free tokens for new users
            },
        })

        return NextResponse.json(
            { message: "Kullanıcı oluşturuldu", user: { id: user.id, email: user.email } },
            { status: 201 }
        )
    } catch (error: any) {
        console.error("Registration error details:", error)
        return NextResponse.json(
            { message: `Hata: ${error.message || "Bilinmeyen sunucu hatası"}` },
            { status: 500 }
        )
    }
}

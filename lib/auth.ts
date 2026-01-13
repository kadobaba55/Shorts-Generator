import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials")
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email
                    }
                })

                if (!user || !user.password) {
                    throw new Error("Invalid credentials")
                }

                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.password
                )

                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials")
                }

                return user
            }
        })
    ],
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                const userData = await prisma.user.findUnique({
                    where: { email: session.user.email! },
                    select: {
                        id: true,
                        tokens: true,
                        name: true,
                        role: true,
                        subscriptionPlan: true,
                        subscriptionEnd: true
                    }
                })

                if (userData) {
                    session.user.id = userData.id
                    session.user.tokens = userData.tokens
                    session.user.name = userData.name
                    // @ts-ignore
                    session.user.role = userData.role
                    // @ts-ignore
                    session.user.subscriptionPlan = userData.subscriptionPlan
                    // @ts-ignore
                    session.user.subscriptionEnd = userData.subscriptionEnd
                }
            }
            return session
        },
        async jwt({ token, user, trigger, session }) {
            if (trigger === "update" && session) {
                return { ...token, ...session.user }
            }
            // On initial sign-in, add role to token
            if (user) {
                token.role = (user as any).role
            }
            return token
        }
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
}

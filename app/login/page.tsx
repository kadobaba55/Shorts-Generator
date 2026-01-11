"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('> ERROR: Invalid credentials')
                toast.error('Login failed')
                return
            }

            toast.success('Login successful!')
            router.push('/')
            router.refresh()
        } catch (error) {
            console.log(error)
            setError('> ERROR: Connection failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-terminal p-4">
            {/* CRT Scanlines */}
            <div className="crt-scanlines fixed inset-0 pointer-events-none z-50"></div>

            {/* Terminal Window */}
            <div className="w-full max-w-md border-2 border-neon-green bg-bg-terminal animate-slide-up">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-neon-green/30 bg-bg-card">
                    <span className="w-3 h-3 rounded-full bg-neon-red"></span>
                    <span className="w-3 h-3 rounded-full bg-neon-amber"></span>
                    <span className="w-3 h-3 rounded-full bg-neon-green"></span>
                    <span className="font-mono text-sm text-neon-green ml-2">
                        terminal://login
                    </span>
                </div>

                {/* Terminal Content */}
                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div className="text-center space-y-2">
                        <h1 className="font-pixel text-xl text-neon-green neon-pulse">
                            LOGIN
                        </h1>
                        <p className="font-mono text-sm text-gray-500">
                            &gt; Enter your credentials_
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 border-2 border-neon-red bg-neon-red/10 font-mono text-sm text-neon-red">
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="font-mono text-sm text-neon-amber">
                                &gt; EMAIL:
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-retro"
                                placeholder="user@example.com"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="font-mono text-sm text-neon-amber">
                                &gt; PASSWORD:
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-retro"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 font-pixel text-sm disabled:opacity-50 bg-neon-green text-black hover:bg-neon-cyan transition-colors border-2 border-neon-green"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="loading-ascii"></span>
                                    AUTHENTICATING...
                                </span>
                            ) : (
                                'EXECUTE >> LOGIN'
                            )}
                        </button>
                    </form>

                    {/* Register Link */}
                    <div className="text-center font-mono text-sm">
                        <span className="text-gray-500">No account? </span>
                        <Link href="/register" className="text-neon-cyan hover:text-neon-green transition-colors">
                            [REGISTER]
                        </Link>
                    </div>

                    {/* Back Link */}
                    <div className="text-center">
                        <Link href="/" className="font-mono text-xs text-gray-600 hover:text-neon-green transition-colors">
                            [← BACK TO HOME]
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

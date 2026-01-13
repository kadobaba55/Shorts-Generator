"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Image from 'next/image'

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
                setError('Email veya şifre hatalı')
                toast.error('Giriş başarısız')
                return
            }

            toast.success('Giriş başarılı!')
            router.push('/')
            router.refresh()
        } catch (error) {
            console.log(error)
            setError('Bağlantı hatası')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-kado-bg p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-0 w-96 h-96 bg-kado-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-kado-secondary/20 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-kado-surface/80 backdrop-blur-lg border border-kado-border rounded-2xl p-8 shadow-lg">

                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4 hover:scale-105 transition-transform">
                            <Image
                                src="/logo_final.png"
                                alt="Kadostudio"
                                width={64}
                                height={64}
                                className="object-contain"
                            />
                        </Link>
                        <h1 className="text-2xl font-heading font-bold text-kado-text mb-2">
                            Tekrar Hoş Geldin! 👋
                        </h1>
                        <p className="text-sm text-kado-text-secondary font-body">
                            Hesabınıza giriş yapın
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-3 bg-kado-error/10 border border-kado-error/30 rounded-xl text-kado-error text-sm flex items-center gap-2"
                            >
                                <span>⚠️</span>
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                                Email
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-kado-text-muted">📧</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-12"
                                    placeholder="ornek@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                                Şifre
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-kado-text-muted">🔒</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pl-12"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-4 rounded-xl text-base"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner w-5 h-5" />
                                    Giriş yapılıyor...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Giriş Yap
                                    <span>→</span>
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-kado-border" />
                        <span className="text-xs text-kado-text-muted font-body">veya</span>
                        <div className="flex-1 h-px bg-kado-border" />
                    </div>

                    {/* Google Login Placeholder */}
                    <button
                        type="button"
                        className="w-full py-3 px-4 rounded-xl bg-kado-surface border border-kado-border hover:border-kado-primary transition-all flex items-center justify-center gap-3 text-kado-text font-body"
                        onClick={() => toast('Google ile giriş yakında!')}
                    >
                        <span className="text-xl">🔵</span>
                        Google ile Giriş
                    </button>

                    {/* Links */}
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-sm text-kado-text-secondary font-body">
                            Hesabınız yok mu?{' '}
                            <Link href="/register" className="text-kado-primary hover:underline font-semibold">
                                Kayıt Ol
                            </Link>
                        </p>
                        <Link href="/" className="block text-sm text-kado-text-muted hover:text-kado-text transition-colors font-body">
                            ← Ana Sayfa
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

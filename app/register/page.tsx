"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            })

            if (res.ok) {
                toast.success('Kayıt başarılı!')
                router.push('/login')
            } else {
                const text = await res.text()
                try {
                    const data = JSON.parse(text)
                    setError(data.message || 'Kayıt başarısız')
                } catch {
                    setError('Sunucu hatası')
                }
            }
        } catch (error: any) {
            setError(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-kado-bg p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/3 right-0 w-96 h-96 bg-kado-secondary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-kado-primary/20 rounded-full blur-3xl pointer-events-none" />

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
                            Hesap Oluştur
                        </h1>
                        <p className="text-sm text-kado-text-secondary font-body">
                            Hemen başla, ücretsiz dene
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-3 bg-kado-error/10 border border-kado-error/30 rounded-xl text-kado-error text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                                İsim
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder="Adınız"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="ornek@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                                Şifre
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <p className="text-xs text-kado-text-muted mt-1">En az 6 karakter</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-accent w-full py-4 rounded-xl text-base"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner w-5 h-5" />
                                    Kayıt yapılıyor...
                                </span>
                            ) : (
                                'Kayıt Ol'
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-kado-border" />
                        <span className="text-xs text-kado-text-muted font-body">veya</span>
                        <div className="flex-1 h-px bg-kado-border" />
                    </div>

                    {/* Google Login */}
                    <button
                        type="button"
                        className="btn-secondary w-full py-3 flex items-center justify-center gap-2 group mb-6"
                        onClick={() => signIn('google', { callbackUrl: '/' })}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.419 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                            </g>
                        </svg>
                        <span className="text-kado-text/80 group-hover:text-kado-text transition-colors">Google ile Kayıt Ol</span>
                    </button>
                    {/* Benefits */}
                    <div className="mt-6 p-4 bg-kado-bg/50 rounded-xl border border-kado-border/50">
                        <p className="text-xs text-kado-text-muted mb-2 font-body">Üyelik avantajları:</p>
                        <ul className="space-y-1 text-xs text-kado-text-secondary font-body">
                            <li className="flex items-center gap-2">
                                <span className="text-kado-success">✓</span>
                                5 ücretsiz video işleme kredisi
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-kado-success">✓</span>
                                AI altyazı ve analiz
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-kado-success">✓</span>
                                Watermark'sız export
                            </li>
                        </ul>
                    </div>

                    {/* Links */}
                    <div className="mt-6 text-center space-y-3">
                        <p className="text-sm text-kado-text-secondary font-body">
                            Zaten hesabınız var mı?{' '}
                            <Link href="/login" className="text-kado-primary hover:underline font-semibold">
                                Giriş Yap
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

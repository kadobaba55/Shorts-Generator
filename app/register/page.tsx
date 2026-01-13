"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { signIn } from 'next-auth/react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()

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
                toast.success(t('success'))
                router.push('/login')
            } else {
                const text = await res.text()
                try {
                    const data = JSON.parse(text)
                    setError(data.message || t('error'))
                } catch {
                    setError(t('error'))
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
            {/* Language Switcher */}
            <div className="absolute top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>

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
                            {t('auth.register.title')}
                        </h1>
                        <p className="text-sm text-kado-text-secondary font-body">
                            {t('auth.register.subtitle')}
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
                                {t('auth.name')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                                {t('auth.email')}
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
                                {t('auth.password')}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-3 rounded-xl font-heading font-semibold"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="spinner w-4 h-4" />
                                    {t('loading')}
                                </span>
                            ) : (
                                t('auth.register.button')
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-kado-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-kado-surface px-2 text-kado-text-muted font-body">
                                VEYA
                            </span>
                        </div>
                    </div>

                    {/* Social Login */}
                    <button
                        type="button"
                        onClick={() => signIn('google')}
                        className="w-full btn-secondary py-3 rounded-xl font-body font-medium flex items-center justify-center gap-3 group"
                    >
                        <Image
                            src="/google.svg"
                            alt="Google"
                            width={20}
                            height={20}
                            className="group-hover:scale-110 transition-transform"
                        />
                        {t('auth.register.google')}
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

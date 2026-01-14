"use client"

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation' // Added useSearchParams
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Image from 'next/image'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/components/LanguageProvider'
import { Suspense } from 'react' // Added Suspense

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()
    const searchParams = useSearchParams()

    // Check if user is coming from editor to save video
    const isGuestSave = searchParams.get('reason') === 'guest_save'

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
                setError(t('error'))
                toast.error(t('error'))
                return
            }

            toast.success(t('success'))

            // Handle callback url manually
            const callbackUrl = searchParams.get('callbackUrl') || '/'
            router.push(callbackUrl)
            router.refresh()
        } catch (error) {
            console.log(error)
            setError(t('error'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-kado-surface/80 backdrop-blur-lg border border-kado-border rounded-2xl p-8 shadow-lg">

            {/* New User Promo Banner - Only for Guest Save */}
            {isGuestSave && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-neon-green/20 to-neon-amber/20 border border-neon-green/30 flex items-center gap-3 animate-pulse">
                    <div className="text-2xl">🎁</div>
                    <div>
                        <h3 className="text-sm font-bold text-neon-green font-heading">
                            Almost There!
                        </h3>
                        <p className="text-xs text-kado-text-secondary font-body">
                            Sign up to <span className="text-white font-bold">save your video</span> and get 5 FREE tokens.
                        </p>
                    </div>
                </div>
            )}

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
                    {isGuestSave ? 'Save Project & Login' : t('auth.login.title')}
                </h1>
                <p className="text-sm text-kado-text-secondary font-body">
                    {t('auth.login.subtitle')}
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
                        {t('auth.email')}
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-kado-bg border border-kado-border rounded-xl focus:border-kado-primary focus:ring-1 focus:ring-kado-primary transition-all text-kado-text font-body"
                        placeholder="hello@example.com"
                    />
                </div>

                <div>
                    <label className="block text-sm text-kado-text-secondary mb-2 font-body">
                        {t('auth.password')}
                    </label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-kado-bg border border-kado-border rounded-xl focus:border-kado-primary focus:ring-1 focus:ring-kado-primary transition-all text-kado-text font-body"
                    />
                </div>

                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded border-kado-border text-kado-primary focus:ring-kado-primary bg-kado-bg" />
                        <span className="text-kado-text-secondary group-hover:text-kado-text transition-colors">{t('auth.remember')}</span>
                    </label>
                    <a href="#" className="text-kado-primary hover:text-kado-secondary transition-colors font-medium">
                        {t('auth.forgot')}
                    </a>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary py-3 font-bold text-lg shadow-lg shadow-kado-primary/20"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Loading...</span>
                        </div>
                    ) : (
                        isGuestSave ? 'Login to Download' : t('auth.login.submit')
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-kado-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-kado-surface px-3 text-kado-text-muted font-body">
                        veya
                    </span>
                </div>
            </div>

            {/* Google Sign In */}
            <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: searchParams.get('callbackUrl') || '/' })}
                className="w-full btn-secondary py-3 rounded-xl font-body font-medium flex items-center justify-center gap-3 group"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('auth.login.google')}
            </button>

            <div className="mt-8 text-center">
                <p className="text-sm text-kado-text-secondary font-body">
                    {t('auth.noAccount')}{' '}
                    <Link href="/register" className="text-kado-primary hover:text-kado-secondary font-bold transition-colors">
                        {t('auth.register.submit')}
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-kado-bg p-4 relative overflow-hidden">
            {/* Language Switcher */}
            <div className="absolute top-4 right-4 z-50">
                <LanguageSwitcher />
            </div>

            {/* Background Effects */}
            <div className="absolute top-1/4 left-0 w-96 h-96 bg-kado-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-kado-secondary/20 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md"
            >
                <Suspense fallback={<div>Loading...</div>}>
                    <LoginContent />
                </Suspense>
            </motion.div>
        </div>
    )
}

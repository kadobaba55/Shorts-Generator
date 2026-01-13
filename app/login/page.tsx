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

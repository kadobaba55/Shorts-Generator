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
        <div className="min-h-screen flex items-center justify-center bg-bg-terminal p-4">
            <div className="w-full max-w-md bg-bg-card border border-gray-800 rounded-lg p-8">

                {/* Başlık */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-white mb-2">
                        Giriş Yap
                    </h1>
                    <p className="text-sm text-gray-400">
                        Hesabınıza giriş yapın
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-bg-terminal border border-gray-700 rounded text-white focus:border-neon-green focus:outline-none transition-colors"
                            placeholder="ornek@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Şifre
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-bg-terminal border border-gray-700 rounded text-white focus:border-neon-green focus:outline-none transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-neon-green text-black font-semibold rounded hover:bg-neon-green/80 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                {/* Linkler */}
                <div className="mt-6 text-center space-y-3">
                    <p className="text-sm text-gray-400">
                        Hesabınız yok mu?{' '}
                        <Link href="/register" className="text-neon-green hover:underline">
                            Kayıt Ol
                        </Link>
                    </p>
                    <Link href="/" className="block text-sm text-gray-500 hover:text-white transition-colors">
                        ← Ana Sayfa
                    </Link>
                </div>
            </div>
        </div>
    )
}

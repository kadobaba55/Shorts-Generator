"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

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
        <div className="min-h-screen flex items-center justify-center bg-bg-terminal p-4">
            <div className="w-full max-w-md bg-bg-card border border-gray-800 rounded-lg p-8">

                {/* Başlık */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-white mb-2">
                        Kayıt Ol
                    </h1>
                    <p className="text-sm text-gray-400">
                        Yeni hesap oluşturun
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
                            İsim
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-bg-terminal border border-gray-700 rounded text-white focus:border-neon-green focus:outline-none transition-colors"
                            placeholder="Adınız"
                            required
                        />
                    </div>

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
                        {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                    </button>
                </form>

                {/* Linkler */}
                <div className="mt-6 text-center space-y-3">
                    <p className="text-sm text-gray-400">
                        Zaten hesabınız var mı?{' '}
                        <Link href="/login" className="text-neon-green hover:underline">
                            Giriş Yap
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

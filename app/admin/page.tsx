'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface User {
    id: string
    name: string | null
    email: string | null
    tokens: number
    subscriptionPlan: string
    subscriptionEnd: string | null
    createdAt: string
    usageCount: number
}

export default function AdminPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (status === 'loading') return

        if (status === 'unauthenticated') {
            toast.error('Lütfen giriş yapın')
            router.push('/login')
            return
        }

        if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') {
            toast.error('Erişim reddedildi')
            router.push('/')
            return
        }

        fetchUsers()
    }, [status, session, router])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setUsers(data.users)
        } catch (error) {
            toast.error('Veriler yüklenemedi')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdateTokens = async (userId: string, currentTokens: number) => {
        const amountStr = prompt(`Mevcut: ${currentTokens}\nEklenecek miktar (negatif = çıkar):`, "100")
        if (!amountStr) return

        const amount = parseInt(amountStr)
        if (isNaN(amount)) return toast.error("Geçersiz miktar")

        try {
            const res = await fetch('/api/admin/tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount })
            })

            if (!res.ok) throw new Error('Update failed')

            toast.success('Kredi güncellendi')
            fetchUsers()
        } catch (error) {
            toast.error('Hata oluştu')
        }
    }

    const totalTokens = users.reduce((acc, user) => acc + user.tokens, 0)
    const totalUsage = users.reduce((acc, user) => acc + user.usageCount, 0)

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="min-h-screen bg-bg-terminal flex items-center justify-center">
                <div className="text-gray-400">Yükleniyor...</div>
            </div>
        )
    }

    if (!session || (session?.user as any)?.role !== 'ADMIN') {
        return null
    }

    return (
        <div className="min-h-screen bg-bg-terminal">
            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-white font-semibold">Admin Panel</h1>
                    <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                        ← Ana Sayfa
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* İstatistikler */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-bg-card border border-gray-800 rounded-lg p-6 text-center">
                        <div className="text-3xl font-bold text-white">{users.length}</div>
                        <div className="text-sm text-gray-400">Kullanıcı</div>
                    </div>
                    <div className="bg-bg-card border border-gray-800 rounded-lg p-6 text-center">
                        <div className="text-3xl font-bold text-neon-green">{totalTokens}</div>
                        <div className="text-sm text-gray-400">Toplam Kredi</div>
                    </div>
                    <div className="bg-bg-card border border-gray-800 rounded-lg p-6 text-center">
                        <div className="text-3xl font-bold text-blue-400">{totalUsage}</div>
                        <div className="text-sm text-gray-400">Toplam Kullanım</div>
                    </div>
                </div>

                {/* Kullanıcı Tablosu */}
                <div className="bg-bg-card border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <span className="text-white font-semibold">Kullanıcılar ({users.length})</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-gray-700 text-gray-400">
                                <tr>
                                    <th className="py-3 px-4 text-left">Kullanıcı</th>
                                    <th className="py-3 px-4 text-left">Plan</th>
                                    <th className="py-3 px-4 text-left">Kredi</th>
                                    <th className="py-3 px-4 text-left">Kullanım</th>
                                    <th className="py-3 px-4 text-left">Kayıt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-neon-green/20 rounded-full flex items-center justify-center text-neon-green text-xs font-semibold">
                                                    {user.name?.[0] || user.email?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <div className="text-white">{user.name || 'Anonim'}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs rounded ${user.subscriptionPlan === 'PROFESSIONAL'
                                                    ? 'bg-purple-500/20 text-purple-400'
                                                    : user.subscriptionPlan === 'PRO'
                                                        ? 'bg-blue-500/20 text-blue-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {user.subscriptionPlan}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleUpdateTokens(user.id, user.tokens)}
                                                className="text-neon-green hover:underline"
                                            >
                                                {user.tokens}
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400">
                                            {user.usageCount}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 text-xs">
                                            {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

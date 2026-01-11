'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

interface Transaction {
    id: string
    amount: number
    type: string
    createdAt: string
}

export default function ProfilePage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            fetchTransactions()
        }
    }, [status, router])

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/transactions')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setTransactions(data.transactions)
        } catch (error) {
            toast.error('İşlem geçmişi yüklenemedi')
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-bg-terminal flex items-center justify-center">
                <div className="text-gray-400">Yükleniyor...</div>
            </div>
        )
    }

    if (!session) return null

    const totalUsage = transactions.filter(t => t.type === 'USAGE').length
    const totalPurchases = transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0)

    return (
        <div className="min-h-screen bg-bg-terminal">
            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="text-neon-green font-semibold">
                        ← Ana Sayfa
                    </Link>
                    <h1 className="text-white font-semibold">Profil</h1>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-sm text-red-400 hover:text-red-300"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Sol Kolon - Profil Bilgisi */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Profil Kartı */}
                        <div className="bg-bg-card border border-gray-800 rounded-lg p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-neon-green/20 border border-neon-green rounded-full flex items-center justify-center text-2xl font-semibold text-neon-green">
                                    {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                                </div>
                                <div>
                                    <div className="text-white font-semibold">{session.user?.name || 'Kullanıcı'}</div>
                                    <div className="text-sm text-gray-400">{session.user?.email}</div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Plan:</span>
                                    <span className="text-white text-sm">{(session.user as any)?.subscriptionPlan || 'Ücretsiz'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Kalan Kredi:</span>
                                    <span className="text-neon-green font-semibold text-lg">{session.user?.tokens || 0}</span>
                                </div>
                            </div>

                            <Link
                                href="/pricing"
                                className="block w-full mt-6 py-3 bg-neon-green text-black text-center font-semibold rounded hover:bg-neon-green/80 transition-colors"
                            >
                                Kredi Satın Al
                            </Link>
                        </div>

                        {/* Hızlı Eylemler */}
                        <div className="bg-bg-card border border-gray-800 rounded-lg overflow-hidden">
                            <Link href="/" className="flex items-center gap-3 p-4 hover:bg-gray-800 transition-colors border-b border-gray-700">
                                <span>🎬</span>
                                <span className="text-white">Yeni Video</span>
                            </Link>
                            <Link href="/pricing" className="flex items-center gap-3 p-4 hover:bg-gray-800 transition-colors">
                                <span>💳</span>
                                <span className="text-white">Fiyatlandırma</span>
                            </Link>
                        </div>
                    </div>

                    {/* Sağ Kolon - İstatistikler ve İşlemler */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* İstatistikler */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-bg-card border border-gray-800 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white">{totalUsage}</div>
                                <div className="text-xs text-gray-400">Kullanım</div>
                            </div>
                            <div className="bg-bg-card border border-gray-800 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white">{totalPurchases}</div>
                                <div className="text-xs text-gray-400">Satın Alınan</div>
                            </div>
                            <div className="bg-bg-card border border-gray-800 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-neon-green">{session.user?.tokens || 0}</div>
                                <div className="text-xs text-gray-400">Bakiye</div>
                            </div>
                        </div>

                        {/* İşlem Geçmişi */}
                        <div className="bg-bg-card border border-gray-800 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-700">
                                <span className="text-white font-semibold">İşlem Geçmişi</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-gray-700 text-gray-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Tarih</th>
                                            <th className="px-4 py-3 text-left">Tür</th>
                                            <th className="px-4 py-3 text-right">Miktar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                    Henüz işlem yok
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.map((transaction) => (
                                                <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {new Date(transaction.createdAt).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs rounded ${transaction.type === 'PURCHASE'
                                                                ? 'bg-green-500/20 text-green-400'
                                                                : 'bg-blue-500/20 text-blue-400'
                                                            }`}>
                                                            {transaction.type === 'PURCHASE' ? 'Satın Alma' : 'Kullanım'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

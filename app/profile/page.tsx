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
    const { data: session, status, update } = useSession()
    const router = useRouter()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editName, setEditName] = useState('')

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        } else if (status === 'authenticated') {
            fetchTransactions()
            setEditName(session.user?.name || '')
        }
    }, [status, router, session])

    const handleUpdateProfile = async () => {
        if (!editName.trim()) return
        setIsSaving(true)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName })
            })

            if (!res.ok) throw new Error('Güncelleme başarısız')

            await update({ name: editName }) // Session güncelle
            toast.success('Profil güncellendi')
            setIsEditing(false)
        } catch (error) {
            toast.error('Profil güncellenemedi')
        } finally {
            setIsSaving(false)
        }
    }

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

    // Avatar Component helper
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    }

    const getInitials = (name: string) => {
        const names = name.split(' ')
        let initials = names[0].substring(0, 1).toUpperCase()
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase()
        }
        return initials
    }

    const Avatar = ({ name, email }: { name: string, email?: string | null }) => {
        const bgColor = stringToColor(email || name || 'user')
        const initials = getInitials(name || 'U')

        return (
            <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg border-2 border-white/10"
                style={{ backgroundColor: bgColor }}
            >
                {initials}
            </div>
        )
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
                                <Avatar
                                    name={session.user?.name || 'Kullanıcı'}
                                    email={session.user?.email}
                                />
                                <div className="flex-1">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:border-neon-green outline-none w-full"
                                                placeholder="İsim Girin"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-white font-semibold text-lg">{session.user?.name || 'Kullanıcı'}</div>
                                    )}
                                    <div className="text-sm text-gray-400">{session.user?.email}</div>
                                </div>
                                <button
                                    onClick={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
                                    disabled={isSaving}
                                    className={`text-xs px-3 py-1 rounded border transition-colors ${isEditing
                                        ? 'bg-neon-green text-black border-neon-green hover:bg-neon-green/80'
                                        : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                                        }`}
                                >
                                    {isSaving ? '...' : isEditing ? 'Kaydet' : 'Düzenle'}
                                </button>
                                {isEditing && (
                                    <button
                                        onClick={() => {
                                            setIsEditing(false)
                                            setEditName(session.user?.name || '')
                                        }}
                                        className="text-xs px-3 py-1 rounded border border-red-500/50 text-red-400 hover:bg-red-500/10"
                                    >
                                        İptal
                                    </button>
                                )}
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

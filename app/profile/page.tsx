'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

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

            await update({ name: editName })
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
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    const getInitials = (name: string) => {
        const names = name.split(' ')
        let initials = names[0].substring(0, 1).toUpperCase()
        if (names.length > 1) {
            initials += names[names.length - 1].substring(0, 1).toUpperCase()
        }
        return initials
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-kado-bg flex items-center justify-center">
                <div className="flex items-center gap-3 text-kado-text-secondary">
                    <span className="spinner" />
                    Yükleniyor...
                </div>
            </div>
        )
    }

    if (!session) return null

    const totalUsage = transactions.filter(t => t.type === 'USAGE').length
    const totalPurchases = transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0)

    return (
        <div className="min-h-screen bg-kado-bg relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-1/3 w-96 h-96 bg-kado-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-kado-secondary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 border-b border-kado-border/50 bg-kado-bg/80 backdrop-blur-lg sticky top-0">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 text-kado-primary hover:text-kado-primary/80 transition-colors">
                        <span>←</span>
                        <span className="font-heading font-semibold">Ana Sayfa</span>
                    </Link>
                    <h1 className="font-heading font-bold text-kado-text">Profil</h1>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="text-sm text-kado-error hover:text-kado-error/80 transition-colors"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Sol Kolon - Profil Bilgisi */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Profil Kartı */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-kado-surface/80 backdrop-blur-lg border border-kado-border rounded-2xl p-6 overflow-hidden"
                        >
                            <div className="flex flex-col items-center gap-4 mb-6">
                                {/* Avatar */}
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-heading font-bold text-white shadow-lg"
                                    style={{ background: `linear-gradient(135deg, ${stringToColor(session.user?.email || 'user')}, ${stringToColor(session.user?.name || 'user')})` }}
                                >
                                    {getInitials(session.user?.name || 'U')}
                                </div>

                                {/* Info */}
                                <div className="text-center">
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="input text-center font-heading font-semibold text-lg mb-2"
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="font-heading font-bold text-xl text-kado-text mb-1">
                                            {session.user?.name || 'Kullanıcı'}
                                        </div>
                                    )}
                                    <div className="text-sm text-kado-text-muted truncate max-w-[200px]">
                                        {session.user?.email}
                                    </div>
                                </div>

                                {/* Edit Button */}
                                {isEditing ? (
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={handleUpdateProfile}
                                            disabled={isSaving}
                                            className="btn-primary flex-1 py-2 rounded-xl text-sm"
                                        >
                                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false)
                                                setEditName(session.user?.name || '')
                                            }}
                                            className="btn-ghost flex-1 py-2 rounded-xl text-sm text-kado-error"
                                        >
                                            İptal
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn-ghost w-full py-2 rounded-xl text-sm"
                                    >
                                        ✏️ Profili Düzenle
                                    </button>
                                )}
                            </div>

                            {/* Plan Info */}
                            <div className="space-y-3 pt-4 border-t border-kado-border/50">
                                <div className="flex items-center justify-between">
                                    <span className="text-kado-text-secondary text-sm">Plan:</span>
                                    <span className="badge badge-primary">
                                        {(session.user as any)?.subscriptionPlan || 'Ücretsiz'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-kado-text-secondary text-sm">Kalan Kredi:</span>
                                    <span className="text-2xl font-heading font-bold text-kado-accent">
                                        {session.user?.tokens || 0}
                                    </span>
                                </div>
                            </div>

                            <Link
                                href="/pricing"
                                className="btn-accent block w-full mt-6 py-3 rounded-xl text-center"
                            >
                                Kredi Satın Al
                            </Link>
                        </motion.div>

                        {/* Hızlı Eylemler */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-kado-surface/80 backdrop-blur-lg border border-kado-border rounded-2xl overflow-hidden"
                        >
                            <Link href="/" className="flex items-center gap-3 p-4 hover:bg-kado-surface-hover transition-colors border-b border-kado-border/50">
                                <span className="font-body text-kado-text">Yeni Video</span>
                                <span className="ml-auto text-kado-text-muted">→</span>
                            </Link>
                            <Link href="/pricing" className="flex items-center gap-3 p-4 hover:bg-kado-surface-hover transition-colors">
                                <span className="font-body text-kado-text">Fiyatlandırma</span>
                                <span className="ml-auto text-kado-text-muted">→</span>
                            </Link>
                        </motion.div>
                    </div>

                    {/* Sağ Kolon - İstatistikler ve İşlemler */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* İstatistikler */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-3 gap-4"
                        >
                            {[
                                { label: 'Kullanım', value: totalUsage, color: 'text-kado-info' },
                                { label: 'Satın Alınan', value: totalPurchases, color: 'text-kado-success' },
                                { label: 'Bakiye', value: session.user?.tokens || 0, color: 'text-kado-accent' },
                            ].map((stat, i) => (
                                <div key={stat.label} className="bg-kado-surface/80 backdrop-blur-lg border border-kado-border rounded-xl p-4 text-center">
                                    <div className={`text-2xl font-heading font-bold ${stat.color}`}>{stat.value}</div>
                                    <div className="text-xs text-kado-text-muted font-body">{stat.label}</div>
                                </div>
                            ))}
                        </motion.div>

                        {/* İşlem Geçmişi */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-kado-surface/80 backdrop-blur-lg border border-kado-border rounded-2xl overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-kado-border/50 flex items-center justify-between">
                                <span className="font-heading font-semibold text-kado-text">İşlem Geçmişi</span>
                                <span className="badge badge-secondary">{transactions.length} işlem</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm font-body">
                                    <thead className="border-b border-kado-border/50 text-kado-text-muted">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Tarih</th>
                                            <th className="px-6 py-3 text-left">Tür</th>
                                            <th className="px-6 py-3 text-right">Miktar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center text-kado-text-muted">
                                                    Henüz işlem yok
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.map((transaction) => (
                                                <tr key={transaction.id} className="border-b border-kado-border/30 hover:bg-kado-surface-hover transition-colors">
                                                    <td className="px-6 py-4 text-kado-text-secondary">
                                                        {new Date(transaction.createdAt).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`badge ${transaction.type === 'PURCHASE'
                                                            ? 'badge-success'
                                                            : 'badge-primary'
                                                            }`}>
                                                            {transaction.type === 'PURCHASE' ? 'Satın Alma' : 'Kullanım'}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-semibold ${transaction.amount > 0 ? 'text-kado-success' : 'text-kado-error'}`}>
                                                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}

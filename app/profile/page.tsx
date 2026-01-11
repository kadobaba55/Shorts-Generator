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
            toast.error('Failed to load transactions')
        } finally {
            setIsLoading(false)
        }
    }

    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen bg-bg-terminal flex items-center justify-center">
                <div className="font-mono text-neon-green flex items-center gap-3">
                    <span className="loading-ascii"></span>
                    LOADING USER DATA...
                </div>
            </div>
        )
    }

    if (!session) return null

    const totalUsage = transactions.filter(t => t.type === 'USAGE').length
    const totalPurchases = transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0)

    return (
        <div className="min-h-screen bg-bg-terminal text-neon-green">
            {/* CRT Scanlines */}
            <div className="crt-scanlines fixed inset-0 pointer-events-none z-50"></div>

            {/* Header */}
            <header className="border-b-2 border-neon-green/30 bg-bg-card/80">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="w-8 h-8 border-2 border-neon-green flex items-center justify-center hover:bg-neon-green/10 transition-all">
                        <span className="text-neon-green font-mono text-lg">▶</span>
                    </Link>
                    <div className="font-mono text-sm text-neon-amber">
                        [ USER PROFILE ]
                    </div>
                    <Link href="/" className="font-mono text-xs text-neon-green hover:text-neon-cyan transition-colors">
                        [← HOME]
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - Profile Info */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Profile Card */}
                        <div className="border-2 border-neon-green">
                            <div className="px-4 py-3 border-b-2 border-neon-green/30 bg-bg-card">
                                <span className="font-mono text-sm text-neon-amber">&gt; USER_INFO</span>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 border-2 border-neon-green flex items-center justify-center font-pixel text-xl text-neon-green">
                                        {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1 font-mono">
                                        <div className="text-neon-green">{session.user?.name || 'User'}</div>
                                        <div className="text-xs text-gray-500">{session.user?.email}</div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-neon-green/30 space-y-3">
                                    {/* Subscription Plan */}
                                    <div className="flex items-center justify-between font-mono text-sm">
                                        <span className="text-gray-500">PLAN:</span>
                                        <span className={`px-2 py-1 border text-xs ${(session.user as any)?.subscriptionPlan === 'PROFESSIONAL'
                                                ? 'border-neon-cyan text-neon-cyan'
                                                : (session.user as any)?.subscriptionPlan === 'PRO'
                                                    ? 'border-neon-magenta text-neon-magenta'
                                                    : 'border-gray-600 text-gray-400'
                                            }`}>
                                            {(session.user as any)?.subscriptionPlan || 'FREE'}
                                        </span>
                                    </div>

                                    {/* Token Balance */}
                                    <div className="flex items-center justify-between font-mono text-sm">
                                        <span className="text-gray-500">TOKENS:</span>
                                        <span className="font-pixel text-xl text-neon-green">{session.user?.tokens || 0}</span>
                                    </div>

                                    {/* Upgrade Button */}
                                    <Link
                                        href="/pricing"
                                        className="w-full btn-primary py-2 text-center block text-sm mt-4"
                                    >
                                        {(session.user as any)?.subscriptionPlan === 'FREE'
                                            ? 'UPGRADE PLAN'
                                            : 'BUY TOKENS'
                                        }
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="border-2 border-neon-green">
                            <div className="px-4 py-3 border-b-2 border-neon-green/30 bg-bg-card">
                                <span className="font-mono text-sm text-neon-amber">&gt; ACTIONS</span>
                            </div>
                            <div className="p-2 space-y-1">
                                <Link href="/" className="flex items-center gap-3 p-3 font-mono text-sm hover:bg-neon-green/10 transition-colors">
                                    <span>🎬</span>
                                    <span>NEW VIDEO</span>
                                </Link>
                                <Link href="/history" className="flex items-center gap-3 p-3 font-mono text-sm hover:bg-neon-green/10 transition-colors text-gray-400">
                                    <span>📊</span>
                                    <span>HISTORY</span>
                                </Link>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="w-full flex items-center gap-3 p-3 font-mono text-sm hover:bg-neon-red/10 text-neon-red transition-colors"
                                >
                                    <span>🚪</span>
                                    <span>LOGOUT</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Stats & Transactions */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="border-2 border-neon-green p-4 text-center">
                                <div className="font-mono text-xs text-neon-amber mb-2">&gt; TOTAL_USAGE</div>
                                <div className="font-pixel text-2xl text-neon-green">{totalUsage}</div>
                            </div>
                            <div className="border-2 border-neon-cyan p-4 text-center">
                                <div className="font-mono text-xs text-neon-amber mb-2">&gt; PURCHASED</div>
                                <div className="font-pixel text-2xl text-neon-cyan">{totalPurchases}</div>
                            </div>
                            <div className="border-2 border-neon-magenta p-4 text-center">
                                <div className="font-mono text-xs text-neon-amber mb-2">&gt; BALANCE</div>
                                <div className="font-pixel text-2xl text-neon-magenta">{session.user?.tokens || 0}</div>
                            </div>
                        </div>

                        {/* Transaction History */}
                        <div className="border-2 border-neon-green">
                            <div className="px-4 py-3 border-b-2 border-neon-green/30 bg-bg-card">
                                <span className="font-mono text-sm text-neon-amber">&gt; TRANSACTION_LOG [{transactions.length}]</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full font-mono text-sm">
                                    <thead className="border-b border-neon-green/30 text-neon-amber text-xs">
                                        <tr>
                                            <th className="px-4 py-3 text-left">DATE</th>
                                            <th className="px-4 py-3 text-left">TYPE</th>
                                            <th className="px-4 py-3 text-right">AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-600">
                                                    &gt; NO_TRANSACTIONS_FOUND
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.map((transaction) => (
                                                <tr key={transaction.id} className="border-b border-neon-green/10 hover:bg-neon-green/5 transition-colors">
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs border ${transaction.type === 'PURCHASE'
                                                                ? 'border-neon-green text-neon-green'
                                                                : transaction.type === 'USAGE'
                                                                    ? 'border-neon-cyan text-neon-cyan'
                                                                    : 'border-neon-amber text-neon-amber'
                                                            }`}>
                                                            {transaction.type}
                                                        </span>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right ${transaction.amount > 0 ? 'text-neon-green' : 'text-neon-red'
                                                        }`}>
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

            {/* Footer */}
            <footer className="border-t-2 border-neon-green/30 py-6 mt-20 bg-bg-card/50">
                <div className="container mx-auto px-4 text-center">
                    <span className="font-mono text-xs text-gray-600">
                        SYSTEM ONLINE | Made by <span className="text-neon-green">KADO</span>
                    </span>
                </div>
            </footer>
        </div>
    )
}

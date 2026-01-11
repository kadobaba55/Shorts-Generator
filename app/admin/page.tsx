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
            toast.error('Please login')
            router.push('/login')
            return
        }

        if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') {
            toast.error('Access denied')
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
            toast.error('Failed to load data')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdateTokens = async (userId: string, currentTokens: number) => {
        const amountStr = prompt(`Current: ${currentTokens}\nAmount to add (negative to subtract):`, "100")
        if (!amountStr) return

        const amount = parseInt(amountStr)
        if (isNaN(amount)) return toast.error("Invalid amount")

        try {
            const res = await fetch('/api/admin/tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount })
            })

            if (!res.ok) throw new Error('Update failed')

            toast.success('Tokens updated')
            fetchUsers()
        } catch (error) {
            toast.error('Error occurred')
        }
    }

    const totalTokens = users.reduce((acc, user) => acc + user.tokens, 0)
    const totalUsage = users.reduce((acc, user) => acc + user.usageCount, 0)

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="min-h-screen bg-bg-terminal flex items-center justify-center">
                <div className="font-mono text-neon-green flex items-center gap-2">
                    <span className="loading-ascii"></span>
                    LOADING...
                </div>
            </div>
        )
    }

    if (!session || (session?.user as any)?.role !== 'ADMIN') {
        return null
    }

    return (
        <div className="min-h-screen bg-bg-terminal text-neon-green p-4 md:p-8">
            {/* CRT Scanlines */}
            <div className="crt-scanlines fixed inset-0 pointer-events-none z-50"></div>

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Terminal Window */}
                <div className="border-2 border-neon-green">
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b-2 border-neon-green/30 bg-bg-card">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-neon-red"></span>
                            <span className="w-3 h-3 rounded-full bg-neon-amber"></span>
                            <span className="w-3 h-3 rounded-full bg-neon-green"></span>
                            <span className="font-mono text-sm text-neon-green ml-2">
                                terminal://admin-panel
                            </span>
                        </div>
                        <Link
                            href="/"
                            className="font-mono text-xs text-neon-amber hover:text-neon-green transition-colors"
                        >
                            [← BACK TO APP]
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="p-6 border-b border-neon-green/30">
                        <h1 className="font-pixel text-2xl text-neon-green neon-pulse">
                            ADMIN DASHBOARD
                        </h1>
                        <p className="font-mono text-sm text-gray-500 mt-2">
                            &gt; System monitoring and user management_
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 border-b border-neon-green/30">
                        <div className="p-6 border-r border-neon-green/30">
                            <div className="font-mono text-xs text-neon-amber mb-2">&gt; TOTAL_USERS</div>
                            <div className="font-pixel text-3xl text-neon-green">{users.length}</div>
                        </div>
                        <div className="p-6 border-r border-neon-green/30">
                            <div className="font-mono text-xs text-neon-amber mb-2">&gt; TOTAL_TOKENS</div>
                            <div className="font-pixel text-3xl text-neon-cyan">{totalTokens}</div>
                        </div>
                        <div className="p-6">
                            <div className="font-mono text-xs text-neon-amber mb-2">&gt; TOTAL_USAGE</div>
                            <div className="font-pixel text-3xl text-neon-magenta">{totalUsage}</div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="p-6">
                        <div className="font-mono text-xs text-neon-amber mb-4">
                            &gt; REGISTERED_USERS [{users.length}]
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full font-mono text-sm">
                                <thead className="border-b-2 border-neon-green/30">
                                    <tr className="text-left text-neon-amber">
                                        <th className="py-3 px-4">USER</th>
                                        <th className="py-3 px-4">PLAN</th>
                                        <th className="py-3 px-4">TOKENS</th>
                                        <th className="py-3 px-4">USAGE</th>
                                        <th className="py-3 px-4">CREATED</th>
                                        <th className="py-3 px-4 text-right">STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-b border-neon-green/10 hover:bg-neon-green/5 transition-colors group"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 border border-neon-green flex items-center justify-center text-xs">
                                                        {user.name?.[0] || user.email?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="text-neon-green">{user.name || 'Anonymous'}</div>
                                                        <div className="text-xs text-gray-600">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 text-xs border ${user.subscriptionPlan === 'PROFESSIONAL'
                                                        ? 'border-neon-cyan text-neon-cyan'
                                                        : user.subscriptionPlan === 'PRO'
                                                            ? 'border-neon-magenta text-neon-magenta'
                                                            : 'border-gray-600 text-gray-400'
                                                    }`}>
                                                    {user.subscriptionPlan}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-neon-cyan">{user.tokens}</span>
                                                    <button
                                                        onClick={() => handleUpdateTokens(user.id, user.tokens)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-neon-green transition-all text-xs"
                                                    >
                                                        [EDIT]
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-400">
                                                {user.usageCount}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 text-xs">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span className="inline-flex items-center gap-2 text-neon-green text-xs">
                                                    <span className="w-2 h-2 bg-neon-green animate-retro-blink"></span>
                                                    ONLINE
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-neon-green/30 bg-bg-card/50">
                        <div className="font-mono text-[10px] text-gray-600 text-center">
                            [ ADMIN PANEL v2.0 | SESSION: {session.user?.email} ]
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

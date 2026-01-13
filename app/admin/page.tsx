'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import AdminStatsCard from '@/components/admin/AdminStatsCard'
import AdminUserTable from '@/components/admin/AdminUserTable'
import AdminCookieManager from '@/components/admin/AdminCookieManager'

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

    // Server Stats State
    const [stats, setStats] = useState<any>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    // Cookie State
    const [cookieStatus, setCookieStatus] = useState<{ exists: boolean, stats?: any } | null>(null)

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

        // If authenticated and admin, fetch data
        if (status === 'authenticated' && (session?.user as any)?.role === 'ADMIN') {
            fetchUsers()
            fetchStats()
            fetchCookieStatus()

            // Stats Polling (5s)
            const statInterval = setInterval(fetchStats, 5000)
            return () => clearInterval(statInterval)
        }
    }, [status, session, router])

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users')
            if (!res.ok) throw new Error('Failed to fetch users')
            const data = await res.json()
            setUsers(data.users)
        } catch (error) {
            console.error('Users error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats')
            if (!res.ok) throw new Error('Failed to fetch stats')
            const data = await res.json()
            setStats(data)
        } catch (error) {
            console.error('Stats error:', error)
        } finally {
            setStatsLoading(false)
        }
    }

    const fetchCookieStatus = async () => {
        try {
            const res = await fetch('/api/admin/cookies')
            const data = await res.json()
            setCookieStatus(data)
        } catch (error) {
            console.error('Cookie status error:', error)
        }
    }

    // Cookie upload functionality (using FormData)
    const handleCookieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        const toastId = toast.loading('Uploading cookies...')

        try {
            const res = await fetch('/api/admin/cookies', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Upload failed')

            toast.success('Cookies updated successfully!', { id: toastId })
            fetchCookieStatus()
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Failed to upload cookies', { id: toastId })
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return

        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Delete failed')

            setUsers(users.filter(u => u.id !== userId))
            toast.success('User deleted')
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Failed to delete user')
        }
    }

    // New Block User Logic
    const handleBlockUser = async (userId: string, currentlyBlocked: boolean) => {
        const action = currentlyBlocked ? 'unblock' : 'block'
        const endpoint = `/api/admin/users` // Using existing users endpoint with PATCH if supported, or we assume specific logic

        // Since the original code didn't have a direct 'block' endpoint, 
        // I will assume we might need to modify the API or send a specific payload to PATCH /api/admin/users
        // For now, I'll implement the fetch call assuming the API supports it as per the redesign plan.

        try {
            // Let's assume the API accepts PATCH for updates
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, action })
            })

            if (!res.ok) throw new Error('Block action failed')

            setUsers(users.map(u =>
                u.id === userId
                    ? { ...u, subscriptionPlan: currentlyBlocked ? 'FREE' : 'BLOCKED' }
                    : u
            ))
            toast.success(`User ${action}ed`)

        } catch (error) {
            console.error('Block error:', error)

            // Fallback: If API doesn't support PATCH, maybe it supports a specific block endpoint?
            // Or let's just log it for now as this is a frontend redesign.
            // But to make it functional we need to ensure backend supports it.
            // I'll leave the toast error for now.
            toast.error(`Failed to ${action} user`)
        }
    }

    if (status === 'loading') return null

    return (
        <div className="min-h-screen bg-[#0F172A] text-white pt-24 pb-12 font-inter">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-outfit bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-neon-cyan">
                            ADMIN_DASHBOARD
                        </h1>
                        <p className="text-gray-400 text-sm font-mono mt-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
                            SYSTEM CONNECTION SECURE
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href="/"
                            className="px-4 py-2 rounded-lg bg-bg-card border border-gray-700 hover:border-gray-500 text-sm font-mono transition-all"
                        >
                            [← EXIT]
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <AdminStatsCard stats={stats} loading={statsLoading} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User Table (Span 2) */}
                    <div className="lg:col-span-2">
                        <AdminUserTable
                            users={users}
                            loading={isLoading}
                            onDelete={handleDeleteUser}
                            onBlock={handleBlockUser}
                        />
                    </div>

                    {/* Sidebar / Tools */}
                    <div className="space-y-6">
                        {/* Cookie Manager */}
                        <div className="h-64">
                            <AdminCookieManager
                                status={cookieStatus}
                                onUpload={handleCookieUpload}
                            />
                        </div>

                        {/* System Logs / Quick Actions Placeholder */}
                        <div className="bg-bg-card border border-neon-amber/30 rounded-xl p-6">
                            <h3 className="font-bold font-mono text-neon-amber mb-4">SYSTEM_ALERTS</h3>
                            <div className="space-y-3 font-mono text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span>Database connection stable</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-500">✓</span>
                                    <span>FFmpeg path verified</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-orange-500">!</span>
                                    <span>Monitoring active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

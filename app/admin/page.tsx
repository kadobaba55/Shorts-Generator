'use client'

import { useEffect, useState, useRef } from 'react'
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

    // Server Stats State
    const [stats, setStats] = useState<any>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    // Cookie State
    const [cookieStatus, setCookieStatus] = useState<{ exists: boolean, stats?: any } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const handleCookieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/admin/cookies', {
                method: 'POST',
                body: formData
            })

            if (!res.ok) throw new Error('Upload failed')

            toast.success('Cookies yüklendi')
            fetchCookieStatus()
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (error) {
            toast.error('Yükleme hatası')
        }
    }

    const handleCookieDelete = async () => {
        if (!confirm('Cookie dosyasını silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch('/api/admin/cookies', {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Delete failed')

            toast.success('Cookies silindi')
            fetchCookieStatus()
        } catch (error) {
            toast.error('Silme hatası')
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

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`${userName} kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)
        )
            return

        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Delete failed')
            }

            toast.success('Kullanıcı silindi')
            fetchUsers()
        } catch (error: any) {
            toast.error(error.message || 'Silme başarısız')
        }
    }

    const handleRestart = async () => {
        if (!confirm('Sunucuyu yeniden başlatmak istediğinize emin misiniz?')) return
        try {
            // Gerçek restart endpoint'i olmadığı için simüle ediyoruz veya API eklemeliyiz
            // Şimdilik sadece toast
            toast.loading('Yeniden başlatılıyor (Simülasyon)...')
        } catch (error) {
            toast.error('Hata')
        }
    }

    const totalTokens = users.reduce((acc, user) => acc + user.tokens, 0)
    const totalUsage = users.reduce((acc, user) => acc + user.usageCount, 0)

    // Format Uptime
    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24))
        const h = Math.floor((seconds % (3600 * 24)) / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        return `${d}g ${h}s ${m}d`
    }

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return (
            <div className="min-h-screen bg-bg-terminal flex items-center justify-center">
                <div className="text-gray-400 font-mono">
                    <span className="loading-ascii text-neon-green"></span>
                    <span className="ml-2">SYSTEM_LOADING...</span>
                </div>
            </div>
        )
    }

    if (!session || (session?.user as any)?.role !== 'ADMIN') {
        return null
    }

    return (
        <div className="min-h-screen bg-bg-terminal text-white font-mono">
            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-neon-red rounded-full animate-pulse"></div>
                        <h1 className="text-neon-green font-semibold">ADMIN_CONSOLE</h1>
                    </div>
                    <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors border border-gray-700 px-3 py-1 rounded">
                        [← EXIT]
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-6xl">

                {/* Server Status Section */}
                <div className="mb-8">
                    <h2 className="text-neon-amber text-sm mb-4">&gt; SERVER_STATUS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* CPU */}
                        <div className="bg-bg-card border border-gray-800 p-4 rounded-lg relative overflow-hidden group">
                            <div className="text-xs text-gray-500 mb-1">CPU LOAD</div>
                            <div className={`text-2xl font-bold ${typeof stats?.cpu === 'number' && stats.cpu > 80 ? 'text-neon-red' : 'text-neon-green'}`}>
                                {stats ? `%${stats.cpu}` : '...'}
                            </div>
                            <div className="h-1 bg-gray-800 mt-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${typeof stats?.cpu === 'number' && stats.cpu > 80 ? 'bg-neon-red' : 'bg-neon-green'}`}
                                    style={{ width: `${stats?.cpu || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* RAM */}
                        <div className="bg-bg-card border border-gray-800 p-4 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">MEMORY</div>
                            <div className="text-2xl font-bold text-neon-cyan">
                                {stats ? `%${stats.memory.percentage}` : '...'}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                                {stats ? `${(stats.memory.used / 1024).toFixed(1)}GB / ${(stats.memory.total / 1024).toFixed(1)}GB` : '-'}
                            </div>
                            <div className="h-1 bg-gray-800 mt-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neon-cyan transition-all duration-500"
                                    style={{ width: `${stats?.memory.percentage || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* DISK */}
                        <div className="bg-bg-card border border-gray-800 p-4 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">DISK</div>
                            <div className="text-2xl font-bold text-neon-magenta">
                                {stats ? `%${stats.disk.percentage}` : '...'}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1">
                                {stats ? `${stats.disk.used}GB / ${stats.disk.total}GB` : '-'}
                            </div>
                            <div className="h-1 bg-gray-800 mt-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-neon-magenta transition-all duration-500"
                                    style={{ width: `${stats?.disk.percentage || 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Uptime */}
                        <div className="bg-bg-card border border-gray-800 p-4 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">UPTIME</div>
                            <div className="text-xl font-bold text-white">
                                {stats ? formatUptime(stats.uptime) : '...'}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-neon-green rounded-full"></span>
                                ONLINE
                            </div>
                        </div>
                    </div>
                </div>

                {/* YouTube Cookies Section */}
                <div className="mb-8">
                    <h2 className="text-neon-amber text-sm mb-4 flex items-center gap-2">
                        &gt; YOUTUBE_COOKIES
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${cookieStatus?.exists
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                            }`}>
                            {cookieStatus?.exists ? 'MOUNTED' : 'MISSING'}
                        </span>
                    </h2>

                    <div className="bg-bg-card border border-gray-800 p-6 rounded-lg">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1">
                                <p className="text-gray-400 text-xs mb-3">
                                    "Sign in to confirm you’re not a bot" hatası için gereklidir.
                                    Tarayıcıdan 'cookies.txt' alıp yükleyin.
                                </p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept=".txt"
                                        ref={fileInputRef}
                                        onChange={handleCookieUpload}
                                        className="text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-gray-800 file:text-neon-green hover:file:bg-gray-700 cursor-pointer"
                                    />
                                </div>
                            </div>

                            {cookieStatus?.exists && (
                                <button
                                    onClick={handleCookieDelete}
                                    className="text-xs border border-red-900/50 text-red-500 hover:bg-red-900/20 px-3 py-2 rounded transition-colors font-mono"
                                >
                                    Remove File
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* App Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-bg-card border border-gray-800 rounded-lg p-6 text-center">
                        <div className="text-3xl font-bold text-white">{users.length}</div>
                        <div className="text-xs text-gray-500 mt-1">TOTAL USERS</div>
                    </div>
                    <div className="bg-bg-card border border-gray-800 rounded-lg p-6 text-center">
                        <div className="text-3xl font-bold text-neon-green">{totalTokens}</div>
                        <div className="text-xs text-gray-500 mt-1">CIRCULATING TOKENS</div>
                    </div>
                    <div className="bg-bg-card border border-gray-800 rounded-lg p-6 text-center">
                        <div className="text-3xl font-bold text-blue-400">{totalUsage}</div>
                        <div className="text-xs text-gray-500 mt-1">TOTAL JOBS</div>
                    </div>
                </div>

                {/* User Table */}
                <div className="bg-bg-card border border-gray-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                        <span className="text-neon-amber text-xs">&gt; USER_DATABASE</span>
                        <span className="text-gray-600 text-[10px]">{users.length} RECORDS FOUND</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="border-b border-gray-700 text-gray-500 bg-black/20">
                                <tr>
                                    <th className="py-3 px-4 text-left">USER</th>
                                    <th className="py-3 px-4 text-left">PLAN</th>
                                    <th className="py-3 px-4 text-left">TOKENS</th>
                                    <th className="py-3 px-4 text-left">USAGE</th>
                                    <th className="py-3 px-4 text-left">JOINED</th>
                                    <th className="py-3 px-4 text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center text-neon-green font-bold">
                                                    {user.name?.[0] || user.email?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{user.name || 'Anonymous'}</div>
                                                    <div className="text-[10px] text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded border ${user.subscriptionPlan === 'PROFESSIONAL'
                                                ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
                                                : user.subscriptionPlan === 'PRO'
                                                    ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                                    : 'border-gray-600 text-gray-400'
                                                }`}>
                                                {user.subscriptionPlan}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => handleUpdateTokens(user.id, user.tokens)}
                                                className="text-neon-green hover:text-white hover:underline transition-colors"
                                            >
                                                [{user.tokens}]
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400">
                                            {user.usageCount}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">
                                            {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name || 'User')}
                                                disabled={session?.user?.email === user.email}
                                                className="text-xs px-2 py-1 border border-red-900 text-red-500 hover:bg-red-900/20 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded"
                                            >
                                                TERMINATE
                                            </button>
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

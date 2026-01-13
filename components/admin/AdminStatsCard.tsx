import { useRef, useEffect } from 'react'

interface AdminStatsCardProps {
    stats: any
    loading: boolean
}

export default function AdminStatsCard({ stats, loading }: AdminStatsCardProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-bg-card border border-neon-green/20 rounded-xl p-4 animate-pulse">
                        <div className="h-4 w-20 bg-gray-700/50 rounded mb-2" />
                        <div className="h-8 w-32 bg-gray-700/50 rounded" />
                    </div>
                ))}
            </div>
        )
    }

    if (!stats) return null

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* CPU Usage */}
            <div className="bg-bg-card border border-neon-green/30 rounded-xl p-4 relative overflow-hidden group hover:border-neon-green/50 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-12 h-12 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                </div>
                <h3 className="text-gray-400 text-xs font-mono mb-1">CPU USAGE</h3>
                <div className="text-2xl font-bold font-mono text-neon-green">
                    {stats.cpu?.usage?.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-700/30 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-neon-green transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(stats.cpu?.usage || 0, 100)}%` }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-mono truncate">
                    {stats.cpu?.model}
                </p>
            </div>

            {/* RAM Usage */}
            <div className="bg-bg-card border border-neon-secondary/30 rounded-xl p-4 relative overflow-hidden group hover:border-neon-secondary/50 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-12 h-12 text-neon-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                </div>
                <h3 className="text-gray-400 text-xs font-mono mb-1">RAM USAGE</h3>
                <div className="text-2xl font-bold font-mono text-neon-secondary">
                    {formatBytes(stats.memory?.used)}
                </div>
                <div className="w-full bg-gray-700/30 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-neon-secondary transition-all duration-500 ease-out"
                        style={{ width: `${(stats.memory?.used / stats.memory?.total) * 100}%` }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-mono">
                    Total: {formatBytes(stats.memory?.total)}
                </p>
            </div>

            {/* Storage */}
            <div className="bg-bg-card border border-neon-cyan/30 rounded-xl p-4 relative overflow-hidden group hover:border-neon-cyan/50 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-12 h-12 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                </div>
                <h3 className="text-gray-400 text-xs font-mono mb-1">STORAGE</h3>
                <div className="text-2xl font-bold font-mono text-neon-cyan">
                    {Math.round(stats.storage?.use || 0)}%
                </div>
                <div className="w-full bg-gray-700/30 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-neon-cyan transition-all duration-500 ease-out"
                        style={{ width: `${stats.storage?.use || 0}%` }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-mono">
                    Used: {formatBytes(stats.storage?.used)} / {formatBytes(stats.storage?.size)}
                </p>
            </div>

            {/* Uptime */}
            <div className="bg-bg-card border border-neon-amber/30 rounded-xl p-4 relative overflow-hidden group hover:border-neon-amber/50 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-12 h-12 text-neon-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-gray-400 text-xs font-mono mb-1">UPTIME</h3>
                <div className="text-2xl font-bold font-mono text-neon-amber">
                    {Math.floor((stats.uptime || 0) / 3600)}h
                </div>
                <div className="w-full bg-gray-700/30 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-neon-amber transition-all duration-500 ease-out animate-pulse"
                        style={{ width: '100%' }}
                    />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 font-mono">
                    System active
                </p>
            </div>
        </div>
    )
}

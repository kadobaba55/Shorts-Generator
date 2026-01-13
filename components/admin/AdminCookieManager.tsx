import { useRef } from 'react'

interface AdminCookieManagerProps {
    status: {
        exists: boolean
        stats?: any
    } | null
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

export default function AdminCookieManager({ status, onUpload }: AdminCookieManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    return (
        <div className="bg-bg-card border border-neon-green/30 rounded-xl overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-neon-green/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🍪</span>
                    <h3 className="font-bold font-mono text-neon-green">COOKIE_MANAGER</h3>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${status?.exists
                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                        : 'bg-red-500/10 text-red-500 border-red-500/30'
                    }`}>
                    {status?.exists ? 'ACTIVE' : 'MISSING'}
                </div>
            </div>

            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onUpload}
                    className="hidden"
                    accept=".txt"
                />

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full min-h-[150px] border-2 border-dashed border-gray-700 hover:border-neon-green hover:bg-neon-green/5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group"
                >
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-gray-400 group-hover:text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-gray-300 font-medium">Upload cookies.txt</p>
                        <p className="text-xs text-gray-500 mt-1">Click to browse</p>
                    </div>
                </div>

                {/* Status Info */}
                {status?.exists && (
                    <div className="mt-4 w-full bg-bg-main/50 rounded-lg p-3 text-left font-mono text-xs space-y-1 border border-gray-800">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Size:</span>
                            <span className="text-neon-cyan">{status.stats?.size} bytes</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Updated:</span>
                            <span className="text-gray-300">{new Date(status.stats?.mtime).toLocaleDateString()}</span>
                        </div>
                    </div>
                )}

                {/* Help Text */}
                <div className="mt-4 text-[10px] text-gray-600 font-mono text-left w-full">
                    <p className="mb-1 text-neon-amber">⚠️ IMPORTANT:</p>
                    <p>Use "Get cookies.txt LOCALLY" extension to export cookies from YouTube while logged in.</p>
                </div>
            </div>
        </div>
    )
}

import { useState } from 'react'

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

interface AdminUserTableProps {
    users: User[]
    loading: boolean
    onDelete: (id: string) => void
    onBlock: (id: string, currentlyBlocked: boolean) => void // Updated to support toggle
    onUpdate?: (id: string, data: Partial<User>) => void
}

export default function AdminUserTable({ users, loading, onDelete, onBlock, onUpdate }: AdminUserTableProps) {
    const [search, setSearch] = useState('')

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.id.includes(search)
    )

    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [editForm, setEditForm] = useState({ tokens: 0, subscriptionPlan: 'FREE' })

    const handleEditClick = (user: User) => {
        setEditingUser(user)
        setEditForm({
            tokens: user.tokens,
            subscriptionPlan: user.subscriptionPlan
        })
    }

    const handleSave = () => {
        if (!editingUser) return
        if (onUpdate) {
            onUpdate(editingUser.id, editForm)
        }
        setEditingUser(null)
    }

    if (loading) {
        return (
            <div className="bg-bg-card border border-neon-green/30 rounded-xl p-6 animate-pulse">
                <div className="h-8 w-1/3 bg-gray-700/50 rounded mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 bg-gray-700/30 rounded" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="bg-bg-card border border-neon-green/30 rounded-xl overflow-hidden shadow-lg shadow-black/50">
                {/* Header & Search */}
                <div className="p-4 md:p-6 border-b border-neon-green/20 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/30">
                            <span className="text-xl">👥</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-mono text-neon-green">USER_DATABASE</h2>
                            <p className="text-xs text-gray-500 font-mono">Total Users: {users.length}</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-bg-main border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green placeholder-gray-600 transition-all font-mono"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bg-main/50 text-gray-400 text-xs font-mono border-b border-gray-800">
                                <th className="px-6 py-4 font-medium">USER_INFO</th>
                                <th className="px-6 py-4 font-medium">PLAN</th>
                                <th className="px-6 py-4 font-medium">USAGE</th>
                                <th className="px-6 py-4 font-medium">CREATED</th>
                                <th className="px-6 py-4 font-medium text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-mono text-sm">
                                        No users found matching "{search}"
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center text-black font-bold text-xs">
                                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-200 text-sm">{user.name || 'Anonymous'}</div>
                                                    <div className="text-gray-500 text-xs font-mono">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium font-mono border ${user.subscriptionPlan === 'PRO'
                                                ? 'bg-neon-green/10 text-neon-green border-neon-green/30'
                                                : user.subscriptionPlan === 'BLOCKED'
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                                    : 'bg-gray-700/30 text-gray-400 border-gray-600/30'
                                                }`}>
                                                {user.subscriptionPlan === 'PRO' && '⚡ '}
                                                {user.subscriptionPlan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs">
                                                <div className="text-gray-300">{user.usageCount} videos</div>
                                                <div className="text-gray-500">{user.tokens.toFixed(1)} tokens</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-gray-500 text-xs font-mono">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    title="Edit User"
                                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => onBlock(user.id, user.subscriptionPlan === 'BLOCKED')}
                                                    title={user.subscriptionPlan === 'BLOCKED' ? "Unblock User" : "Block User"}
                                                    className={`p-2 rounded-lg transition-colors ${user.subscriptionPlan === 'BLOCKED'
                                                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                        : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
                                                        }`}
                                                >
                                                    {user.subscriptionPlan === 'BLOCKED' ? '🔓' : '🚫'}
                                                </button>
                                                <button
                                                    onClick={() => onDelete(user.id)}
                                                    title="Delete User"
                                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-bg-card border border-neon-cyan/50 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold font-heading text-white mb-4">Edit User</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">Email</label>
                                <input
                                    type="text"
                                    value={editingUser.email || ''}
                                    disabled
                                    className="w-full bg-black/20 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-neon-cyan mb-1">Tokens</label>
                                <input
                                    type="number"
                                    value={editForm.tokens}
                                    onChange={(e) => setEditForm({ ...editForm, tokens: Number(e.target.value) })}
                                    className="w-full bg-bg-main border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-neon-cyan mb-1">Plan</label>
                                <select
                                    value={editForm.subscriptionPlan}
                                    onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                                    className="w-full bg-bg-main border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                                >
                                    <option value="FREE">FREE</option>
                                    <option value="PRO">PRO</option>
                                    <option value="AGENCY">AGENCY</option>
                                    <option value="BLOCKED">BLOCKED</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-lg bg-neon-cyan text-black font-semibold hover:bg-cyan-400 transition-colors shadow-lg shadow-neon-cyan/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

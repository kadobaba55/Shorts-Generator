'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { formatTime } from '@/lib/estimateTime'

const plans = [
    {
        name: 'ROOKIE',
        id: 'tier_free',
        price: '0',
        period: 'MO',
        description: 'ENTRY_LEVEL_ACCESS',
        tokens: 5,
        features: [
            '5 CREDITS / MO',
            'STANDARD_PROCESSING',
            'AUTO_SUBS_V1',
            '720P_OUTPUT',
            'COMMUNITY_SUPPORT',
        ],
        limitations: [
            'NO_FACE_TRACKING',
            'SLOW_QUEUE_PRIORITY',
        ],
        cta: '[ INITIALIZE ]',
        popular: false,
        color: 'gray'
    },
    {
        name: 'OPERATOR',
        id: 'tier_pro',
        price: '99',
        period: 'MO',
        description: 'ENHANCED_CAPABILITIES',
        tokens: 100,
        features: [
            '100 CREDITS / MO',
            'ADVANCED_PROCESSING',
            'AUTO_SUBS_V2',
            '1080P_OUTPUT',
            'FACE_TRACKING_MODULE',
            'PRIORITY_QUEUE',
            'DIRECT_SUPPORT_LINE',
        ],
        limitations: [],
        cta: '[ UPGRADE_SYSTEM ]',
        popular: true,
        color: 'neon-green'
    },
    {
        name: 'NETRUNNER',
        id: 'tier_biz',
        price: '299',
        period: 'MO',
        description: 'UNRESTRICTED_ACCESS',
        tokens: 500,
        features: [
            '500 CREDITS / MO',
            'PREMIUM_PROCESSING',
            'AUTO_SUBS_MAX',
            '4K_OUTPUT_RENDER',
            'ADVANCED_FACE_TRACKING',
            'INSTANT_QUEUE',
            '24/7_DEDICATED_LINK',
            'API_ACCESS_TOKEN',
        ],
        limitations: [],
        cta: '[ MAXIMIZE_POWER ]',
        popular: false,
        color: 'neon-cyan'
    },
]

export default function PricingPage() {
    const { data: session } = useSession()
    const [isAnnual, setIsAnnual] = useState(false)

    const handleSelectPlan = (planName: string) => {
        if (!session) {
            toast.error('ACCESS_DENIED: PLEASE_LOGIN')
            return
        }

        if (planName === 'ROOKIE') {
            toast('ALREADY_ACTIVE: ROOKIE_PROTOCOL', { icon: '🤖' })
        } else {
            toast.success(`INITIATING_SEQUENCE: ${planName}`, {
                style: {
                    background: '#000',
                    color: '#00ff00',
                    border: '1px solid #00ff00',
                    fontFamily: 'monospace'
                }
            })
            // Payment logic here
        }
    }

    return (
        <div className="min-h-screen bg-[#050505] text-gray-300 font-mono selection:bg-neon-green/30 relative overflow-hidden">
            <Toaster position="bottom-right" />

            {/* Grid Background */}
            <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-transparent via-black/50 to-black z-0" />

            {/* Header */}
            <header className="relative z-10 p-6 flex items-center justify-between border-b border-gray-800 bg-black/50 backdrop-blur-sm">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-16 h-16 animate-pulse-slow">
                        <Image
                            src="/logo_final.png"
                            alt="Tidal Feynman"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </Link>
                <Link href="/" className="text-gray-500 hover:text-white text-xs border border-transparent hover:border-gray-700 px-3 py-1 rounded transition-all">
                    [ RETURN_HOME ]
                </Link>
            </header>

            <div className="relative z-10 container mx-auto px-4 py-16 max-w-7xl">

                {/* Title Section */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-block border border-neon-green/30 px-3 py-1 rounded-full bg-neon-green/5 mb-4">
                        <span className="text-neon-green text-xs tracking-widest">SYSTEM_UPGRADE_MODULE</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-pixel text-white">
                        SELECT_YOUR_<span className="text-neon-green">LOADOUT</span>
                    </h1>
                    <p className="text-gray-500 max-w-xl mx-auto text-sm md:text-base">
                        {'>'} CHOOSE_CONFIGURATION_BELOW
                        <br />
                        {'>'} OPTIMIZE_FOR_MAXIMUM_OUTPUT
                    </p>

                    {/* Annual Toggle */}
                    <div className="flex items-center justify-center gap-4 pt-8">
                        <span className={`text-xs ${!isAnnual ? 'text-white' : 'text-gray-600'}`}>MONTHLY_CYCLE</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`relative w-12 h-6 rounded border transition-colors ${isAnnual ? 'border-neon-green bg-neon-green/10' : 'border-gray-600 bg-gray-900'
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-current rounded-sm transition-transform ${isAnnual ? 'translate-x-6 text-neon-green' : 'translate-x-0 text-gray-400'
                                    }`}
                            />
                        </button>
                        <span className={`text-xs ${isAnnual ? 'text-white' : 'text-gray-600'}`}>
                            ANNUAL_CYCLE
                            <span className="ml-2 text-[10px] text-neon-green border border-neon-green px-1 rounded">
                                SAVE_20%
                            </span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {plans.map((plan) => {
                        const finalPrice = isAnnual && plan.price !== '0'
                            ? Math.round(parseInt(plan.price) * 12 * 0.8)
                            : plan.price

                        const isGreen = plan.color === 'neon-green'
                        const isCyan = plan.color === 'neon-cyan'
                        const borderColor = isGreen ? 'border-neon-green' : isCyan ? 'border-neon-cyan' : 'border-gray-700'
                        const textColor = isGreen ? 'text-neon-green' : isCyan ? 'text-neon-cyan' : 'text-white'

                        return (
                            <motion.div
                                key={plan.name}
                                whileHover={{ scale: 1.02 }}
                                className={`relative group flex flex-col p-6 md:p-8 bg-black/80 border ${borderColor} ${plan.popular ? 'shadow-[0_0_30px_-5px_rgba(0,255,0,0.3)]' : ''
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black border border-neon-green px-3 py-1">
                                        <span className="text-[10px] font-bold text-neon-green tracking-widest">RECOMMENDED_BUILD</span>
                                    </div>
                                )}

                                {/* Header */}
                                <div className="mb-8 text-center border-b border-gray-800 pb-8">
                                    <h3 className={`text-lg font-bold mb-2 ${textColor} tracking-widest`}>{plan.name}</h3>
                                    <div className="flex items-baseline justify-center gap-1 font-pixel">
                                        <span className="text-sm text-gray-500">₺</span>
                                        <span className="text-4xl text-white">{plan.price === '0' ? '0' : finalPrice}</span>
                                        <span className="text-sm text-gray-500">/{isAnnual ? 'YR' : plan.period}</span>
                                    </div>
                                    <p className="text-gray-600 text-xs mt-2 font-mono">[{plan.description}]</p>
                                </div>

                                {/* Features */}
                                <div className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs md:text-sm group-hover:pl-2 transition-all">
                                            <span className={`${textColor}`}>&gt;</span>
                                            <span className="text-gray-300">{feature}</span>
                                        </div>
                                    ))}
                                    {plan.limitations.map((limit, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs md:text-sm opacity-40">
                                            <span className="text-red-500">x</span>
                                            <span className="text-gray-500 line-through">{limit}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={`w-full py-3 text-xs font-bold tracking-widest border transition-all ${plan.popular
                                        ? 'bg-neon-green text-black border-neon-green hover:bg-transparent hover:text-neon-green'
                                        : isCyan
                                            ? 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black'
                                            : 'border-white text-white hover:bg-white hover:text-black'
                                        }`}
                                >
                                    {plan.cta}
                                </button>
                            </motion.div>
                        )
                    })}
                </div>

                {/* FAQ / Info */}
                <div className="mt-24 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div className="border border-gray-800 p-6 bg-black/50 hover:border-neon-green transition-colors group">
                        <h3 className="text-white font-bold mb-2 group-hover:text-neon-green">{'>'} FAQ_01: TOKENS?</h3>
                        <p className="text-gray-500 text-xs leading-relaxed">
                            Tokens are the fuel for the rendering engine. 1 Token = 1 Processed Video.
                            Refreshed system-wide every cycle.
                        </p>
                    </div>
                    <div className="border border-gray-800 p-6 bg-black/50 hover:border-neon-cyan transition-colors group">
                        <h3 className="text-white font-bold mb-2 group-hover:text-neon-cyan">{'>'} FAQ_02: CANCELLATION?</h3>
                        <p className="text-gray-500 text-xs leading-relaxed">
                            Protocols can be terminated at any time via the user dashboard.
                            Service remains active until the cycle completes.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}

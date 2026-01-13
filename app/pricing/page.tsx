'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

const plans = [
    {
        name: 'Ücretsiz',
        price: '0',
        period: 'ay',
        tokens: 5,
        icon: '🎁',
        features: [
            '5 kredi / ay',
            'Standart işleme',
            'Otomatik altyazı',
            '720p çıktı',
        ],
        limitations: [
            'Yüz takibi yok',
            'Düşük öncelik',
        ],
        cta: 'Mevcut Plan',
        popular: false,
        gradient: 'from-gray-500 to-gray-600',
    },
    {
        name: 'Pro',
        price: '99',
        period: 'ay',
        tokens: 100,
        icon: '⚡',
        features: [
            '100 kredi / ay',
            'Gelişmiş işleme',
            'Gelişmiş altyazı',
            '1080p çıktı',
            'Yüz takibi',
            'Öncelikli kuyruk',
        ],
        limitations: [],
        cta: 'Yükselt',
        popular: true,
        gradient: 'from-kado-primary to-kado-secondary',
    },
    {
        name: 'İşletme',
        price: '299',
        period: 'ay',
        tokens: 500,
        icon: '🚀',
        features: [
            '500 kredi / ay',
            'Premium işleme',
            'En iyi altyazı',
            '4K çıktı',
            'Gelişmiş yüz takibi',
            'Anında işleme',
            'API erişimi',
        ],
        limitations: [],
        cta: 'İletişime Geç',
        popular: false,
        gradient: 'from-kado-accent to-orange-500',
    },
]

export default function PricingPage() {
    const { data: session } = useSession()
    const [isAnnual, setIsAnnual] = useState(false)

    const handleSelectPlan = (planName: string) => {
        if (!session) {
            toast.error('Lütfen giriş yapın')
            return
        }

        if (planName === 'Ücretsiz') {
            toast('Zaten bu plandayısınız')
        } else {
            toast.success(`${planName} planı seçildi`)
        }
    }

    return (
        <div className="min-h-screen bg-kado-bg relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-kado-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-kado-secondary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 border-b border-kado-border/50 bg-kado-bg/80 backdrop-blur-lg sticky top-0">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="relative w-12 h-12 hover:scale-105 transition-transform">
                        <Image
                            src="/logo_final.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-sm text-kado-text-secondary hover:text-kado-text transition-colors">
                        <span>←</span>
                        <span>Ana Sayfa</span>
                    </Link>
                </div>
            </header>

            <div className="relative z-10 container mx-auto px-4 py-16 max-w-6xl">
                {/* Başlık */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <span className="badge badge-primary mb-4">💎 Fiyatlandırma</span>
                    <h1 className="text-4xl md:text-5xl font-heading font-bold text-kado-text mb-4">
                        İhtiyacınıza Uygun
                        <br />
                        <span className="text-gradient">Planı Seçin</span>
                    </h1>
                    <p className="text-kado-text-secondary max-w-lg mx-auto font-body">
                        Tüm planlar anında aktif olur. İstediğiniz zaman yükseltin veya iptal edin.
                    </p>

                    {/* Yıllık/Aylık Toggle */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span className={`text-sm font-body ${!isAnnual ? 'text-kado-text' : 'text-kado-text-muted'}`}>Aylık</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`toggle ${isAnnual ? 'active' : ''}`}
                            aria-label="Toggle pricing"
                        />
                        <span className={`text-sm font-body ${isAnnual ? 'text-kado-text' : 'text-kado-text-muted'}`}>
                            Yıllık
                            <span className="ml-2 badge badge-success">%20 indirim</span>
                        </span>
                    </div>
                </motion.div>

                {/* Plan Kartları */}
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan, index) => {
                        const finalPrice = isAnnual && plan.price !== '0'
                            ? Math.round(parseInt(plan.price) * 12 * 0.8)
                            : plan.price

                        return (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative flex flex-col p-6 bg-kado-surface/80 backdrop-blur-lg border rounded-2xl transition-all ${plan.popular
                                    ? 'border-kado-primary shadow-glow-primary'
                                    : 'border-kado-border hover:border-kado-primary/50'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-kado-primary to-kado-secondary text-white text-xs font-semibold px-4 py-1 rounded-full">
                                        ⭐ Önerilen
                                    </div>
                                )}

                                {/* Plan Icon & Name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center text-2xl`}>
                                        {plan.icon}
                                    </div>
                                    <h3 className="text-xl font-heading font-bold text-kado-text">{plan.name}</h3>
                                </div>

                                {/* Fiyat */}
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-kado-text-muted font-body">₺</span>
                                    <span className="text-5xl font-heading font-bold text-kado-text">{plan.price === '0' ? '0' : finalPrice}</span>
                                    <span className="text-kado-text-muted font-body">/{isAnnual ? 'yıl' : plan.period}</span>
                                </div>

                                {/* Özellikler */}
                                <div className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm font-body">
                                            <span className="text-kado-success">✓</span>
                                            <span className="text-kado-text">{feature}</span>
                                        </div>
                                    ))}
                                    {plan.limitations.map((limit, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm font-body opacity-50">
                                            <span className="text-kado-error">✗</span>
                                            <span className="text-kado-text-muted">{limit}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Buton */}
                                <button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={`w-full py-4 rounded-xl font-heading font-semibold transition-all ${plan.popular
                                        ? 'btn-primary'
                                        : 'bg-kado-surface-hover text-kado-text hover:bg-kado-border'
                                        }`}
                                >
                                    {plan.cta}
                                </button>
                            </motion.div>
                        )
                    })}
                </div>

                {/* SSS */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-16 grid md:grid-cols-2 gap-6"
                >
                    {[
                        { q: 'Kredi nedir?', a: 'Her işlenmiş video 1 kredi kullanır. Krediler her ay yenilenir.', icon: '🎫' },
                        { q: 'İptal edebilir miyim?', a: 'Evet, istediğiniz zaman iptal edebilirsiniz. Dönem sonuna kadar aktif kalır.', icon: '🔄' },
                        { q: 'Ödeme yöntemleri?', a: 'Kredi kartı, banka kartı ve havale ile ödeme yapabilirsiniz.', icon: '💳' },
                        { q: 'Destek var mı?', a: 'Tüm planlarda email desteği, Pro ve üstünde öncelikli destek mevcuttur.', icon: '💬' },
                    ].map((faq, i) => (
                        <div key={i} className="p-6 bg-kado-surface/50 border border-kado-border/50 rounded-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xl">{faq.icon}</span>
                                <h3 className="font-heading font-semibold text-kado-text">{faq.q}</h3>
                            </div>
                            <p className="text-kado-text-secondary text-sm font-body">
                                {faq.a}
                            </p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    )
}

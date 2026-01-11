'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

const plans = [
    {
        name: 'Ücretsiz',
        price: '0',
        period: 'ay',
        tokens: 5,
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
    },
    {
        name: 'Pro',
        price: '99',
        period: 'ay',
        tokens: 100,
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
    },
    {
        name: 'İşletme',
        price: '299',
        period: 'ay',
        tokens: 500,
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
        <div className="min-h-screen bg-bg-terminal">
            {/* Header */}
            <header className="border-b border-gray-800 bg-bg-card">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="relative w-12 h-12">
                        <Image
                            src="/logo_final.png"
                            alt="Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </Link>
                    <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                        ← Ana Sayfa
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-4 py-16 max-w-5xl">
                {/* Başlık */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-semibold text-white mb-4">
                        Fiyatlandırma
                    </h1>
                    <p className="text-gray-400">
                        İhtiyacınıza uygun planı seçin
                    </p>

                    {/* Yıllık/Aylık Toggle */}
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <span className={`text-sm ${!isAnnual ? 'text-white' : 'text-gray-500'}`}>Aylık</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${isAnnual ? 'bg-neon-green' : 'bg-gray-700'}`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                        </button>
                        <span className={`text-sm ${isAnnual ? 'text-white' : 'text-gray-500'}`}>
                            Yıllık
                            <span className="ml-2 text-xs text-neon-green">%20 indirim</span>
                        </span>
                    </div>
                </div>

                {/* Plan Kartları */}
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => {
                        const finalPrice = isAnnual && plan.price !== '0'
                            ? Math.round(parseInt(plan.price) * 12 * 0.8)
                            : plan.price

                        return (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col p-6 bg-bg-card border rounded-lg transition-all ${plan.popular
                                        ? 'border-neon-green'
                                        : 'border-gray-800 hover:border-gray-700'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-green text-black text-xs font-semibold px-3 py-1 rounded-full">
                                        Önerilen
                                    </div>
                                )}

                                {/* Plan İsmi */}
                                <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>

                                {/* Fiyat */}
                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-sm text-gray-400">₺</span>
                                    <span className="text-4xl font-bold text-white">{plan.price === '0' ? '0' : finalPrice}</span>
                                    <span className="text-sm text-gray-400">/{isAnnual ? 'yıl' : plan.period}</span>
                                </div>

                                {/* Özellikler */}
                                <div className="space-y-3 mb-6 flex-1">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="text-neon-green">✓</span>
                                            <span className="text-gray-300">{feature}</span>
                                        </div>
                                    ))}
                                    {plan.limitations.map((limit, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm opacity-50">
                                            <span className="text-red-400">✗</span>
                                            <span className="text-gray-500">{limit}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Buton */}
                                <button
                                    onClick={() => handleSelectPlan(plan.name)}
                                    className={`w-full py-3 rounded font-semibold transition-colors ${plan.popular
                                            ? 'bg-neon-green text-black hover:bg-neon-green/80'
                                            : 'bg-gray-800 text-white hover:bg-gray-700'
                                        }`}
                                >
                                    {plan.cta}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* SSS */}
                <div className="mt-16 grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-bg-card border border-gray-800 rounded-lg">
                        <h3 className="text-white font-semibold mb-2">Kredi nedir?</h3>
                        <p className="text-gray-400 text-sm">
                            Her işlenmiş video 1 kredi kullanır. Krediler her ay yenilenir.
                        </p>
                    </div>
                    <div className="p-6 bg-bg-card border border-gray-800 rounded-lg">
                        <h3 className="text-white font-semibold mb-2">İptal edebilir miyim?</h3>
                        <p className="text-gray-400 text-sm">
                            Evet, istediğiniz zaman iptal edebilirsiniz. Dönem sonuna kadar aktif kalır.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

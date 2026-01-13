'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from './LanguageProvider'
import { Locale } from '@/lib/dictionary'

const languages: { code: Locale; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: 'us' },
    { code: 'tr', label: 'Türkçe', flag: 'tr' },
    { code: 'fr', label: 'Français', flag: 'fr' },
    { code: 'de', label: 'Deutsch', flag: 'de' },
    { code: 'es', label: 'Español', flag: 'es' },
    { code: 'it', label: 'Italiano', flag: 'it' },
    { code: 'pt', label: 'Português', flag: 'pt' },
]

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (code: Locale) => {
        setLanguage(code)
        setIsOpen(false)
    }

    const currentLang = languages.find(l => l.code === language) || languages[0]

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 bg-black/50 transition-colors group"
            >
                <span className="w-4 h-4 rounded-full overflow-hidden relative border border-white/20">
                    <img
                        src={`https://flagcdn.com/${currentLang.flag}.svg`}
                        alt={currentLang.label}
                        className="w-full h-full object-cover"
                    />
                </span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors uppercase">
                    {language}
                </span>
                <svg
                    className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-800 ${language === lang.code ? 'text-neon-green bg-gray-800/50' : 'text-gray-300'
                                }`}
                        >
                            <span className="w-4 h-4 rounded-full overflow-hidden relative border border-white/10 shrink-0">
                                <img
                                    src={`https://flagcdn.com/${lang.flag}.svg`}
                                    alt={lang.label}
                                    className="w-full h-full object-cover"
                                />
                            </span>
                            <span>{lang.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

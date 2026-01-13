'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dictionary, Locale, Key } from '@/lib/dictionary'

interface LanguageContextType {
    language: Locale
    setLanguage: (lang: Locale) => void
    t: (key: Key) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Locale>('tr')
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('kado_language') as Locale

        // 1. Check local storage
        if (stored && ['tr', 'en', 'fr', 'de', 'es', 'it', 'pt'].includes(stored)) {
            setLanguageState(stored)
        } else {
            // 2. Check browser language (fallback to 'en')
            const browserLang = navigator.language.split('-')[0] as Locale
            if (['tr', 'fr', 'de', 'es', 'it', 'pt'].includes(browserLang)) {
                setLanguageState(browserLang)
            } else {
                setLanguageState('en')
            }
        }
        setIsLoaded(true)
    }, [])

    const setLanguage = (lang: Locale) => {
        setLanguageState(lang)
        localStorage.setItem('kado_language', lang)
    }

    const t = (key: Key): string => {
        return dictionary[language][key] || key
    }

    // Prevent hydration mismatch by waiting for mount
    // REMOVED: This causes build error because children need context during PRERENDER
    // if (!isLoaded) {
    //    return <>{children}</>
    // }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}

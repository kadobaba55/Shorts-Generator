// Subtitle Style Presets
// 15 different style presets for subtitle customization

export interface SubtitlePreset {
    id: string
    name: string
    icon: string
    font: string
    primaryColor: string
    outlineColor: string
    fontSize: number
    // Background options
    bgEnabled: boolean
    bgColor: string
    bgOpacity: number
    bgBlur: boolean
    bgRadius: number
    // Shadow
    shadowEnabled: boolean
    shadowColor: string
    shadowBlur: number
    // Animation
    animation: 'none' | 'pop' | 'fade' | 'slide' | 'bounce' | 'typewriter'
    animationSpeed: number // 0.5 - 2.0
}

export const SUBTITLE_PRESETS: SubtitlePreset[] = [
    // Original 4
    {
        id: 'viral',
        name: 'Viral',
        icon: '🔥',
        font: 'Impact',
        primaryColor: '#00FFFF',
        outlineColor: '#000000',
        fontSize: 32,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#000000',
        shadowBlur: 4,
        animation: 'pop',
        animationSpeed: 1.0
    },
    {
        id: 'neon',
        name: 'Neon',
        icon: '✨',
        font: 'Arial Black',
        primaryColor: '#FF00FF',
        outlineColor: '#000000',
        fontSize: 30,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#FF00FF',
        shadowBlur: 10,
        animation: 'fade',
        animationSpeed: 1.0
    },
    {
        id: 'minimal',
        name: 'Minimal',
        icon: '🎯',
        font: 'Inter',
        primaryColor: '#FFFFFF',
        outlineColor: '#404040',
        fontSize: 24,
        bgEnabled: true,
        bgColor: '#000000',
        bgOpacity: 0.5,
        bgBlur: false,
        bgRadius: 8,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'none',
        animationSpeed: 1.0
    },
    {
        id: 'karaoke',
        name: 'Karaoke',
        icon: '🎤',
        font: 'Poppins',
        primaryColor: '#FFD700',
        outlineColor: '#000000',
        fontSize: 28,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#000000',
        shadowBlur: 6,
        animation: 'typewriter',
        animationSpeed: 1.2
    },
    // New 11 presets
    {
        id: 'gaming',
        name: 'Gaming',
        icon: '🎮',
        font: 'Oswald',
        primaryColor: '#00FF00',
        outlineColor: '#9B00FF',
        fontSize: 34,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#9B00FF',
        shadowBlur: 8,
        animation: 'bounce',
        animationSpeed: 1.5
    },
    {
        id: 'news',
        name: 'News',
        icon: '📰',
        font: 'Roboto',
        primaryColor: '#1A1A1A',
        outlineColor: '#FFFFFF',
        fontSize: 24,
        bgEnabled: true,
        bgColor: '#FFFFFF',
        bgOpacity: 0.95,
        bgBlur: false,
        bgRadius: 4,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'slide',
        animationSpeed: 0.8
    },
    {
        id: 'cinematic',
        name: 'Cinematic',
        icon: '🎬',
        font: 'Montserrat',
        primaryColor: '#F5C518',
        outlineColor: '#000000',
        fontSize: 26,
        bgEnabled: true,
        bgColor: '#000000',
        bgOpacity: 0.7,
        bgBlur: true,
        bgRadius: 0,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'fade',
        animationSpeed: 0.6
    },
    {
        id: 'tutorial',
        name: 'Tutorial',
        icon: '📚',
        font: 'Open Sans',
        primaryColor: '#FFFFFF',
        outlineColor: '#0066CC',
        fontSize: 24,
        bgEnabled: true,
        bgColor: '#0066CC',
        bgOpacity: 0.9,
        bgBlur: false,
        bgRadius: 12,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'pop',
        animationSpeed: 1.0
    },
    {
        id: 'gradient-pop',
        name: 'Gradient Pop',
        icon: '🌈',
        font: 'Poppins',
        primaryColor: '#FF6B6B',
        outlineColor: '#4ECDC4',
        fontSize: 30,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#4ECDC4',
        shadowBlur: 6,
        animation: 'pop',
        animationSpeed: 1.2
    },
    {
        id: 'shadow-bold',
        name: 'Shadow Bold',
        icon: '⬛',
        font: 'Impact',
        primaryColor: '#FFFFFF',
        outlineColor: '#000000',
        fontSize: 36,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#000000',
        shadowBlur: 12,
        animation: 'none',
        animationSpeed: 1.0
    },
    {
        id: 'outline',
        name: 'Outline',
        icon: '🔲',
        font: 'Raleway',
        primaryColor: 'transparent',
        outlineColor: '#FFFFFF',
        fontSize: 28,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'fade',
        animationSpeed: 1.0
    },
    {
        id: 'retro',
        name: 'Retro',
        icon: '📺',
        font: 'Source Sans Pro',
        primaryColor: '#00FF41',
        outlineColor: '#001100',
        fontSize: 26,
        bgEnabled: true,
        bgColor: '#001100',
        bgOpacity: 0.8,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#00FF41',
        shadowBlur: 4,
        animation: 'typewriter',
        animationSpeed: 1.5
    },
    {
        id: 'glitch',
        name: 'Glitch',
        icon: '⚡',
        font: 'Oswald',
        primaryColor: '#FF0000',
        outlineColor: '#00FFFF',
        fontSize: 32,
        bgEnabled: false,
        bgColor: '#000000',
        bgOpacity: 0,
        bgBlur: false,
        bgRadius: 0,
        shadowEnabled: true,
        shadowColor: '#00FFFF',
        shadowBlur: 3,
        animation: 'bounce',
        animationSpeed: 2.0
    },
    {
        id: 'handwritten',
        name: 'Handwritten',
        icon: '✍️',
        font: 'Nunito',
        primaryColor: '#FFFFFF',
        outlineColor: '#333333',
        fontSize: 28,
        bgEnabled: true,
        bgColor: '#FFF9C4',
        bgOpacity: 0.9,
        bgBlur: false,
        bgRadius: 16,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'slide',
        animationSpeed: 0.8
    },
    {
        id: 'modern',
        name: 'Modern',
        icon: '💎',
        font: 'Inter',
        primaryColor: '#FFFFFF',
        outlineColor: 'transparent',
        fontSize: 24,
        bgEnabled: true,
        bgColor: '#000000',
        bgOpacity: 0.3,
        bgBlur: true,
        bgRadius: 20,
        shadowEnabled: false,
        shadowColor: '#000000',
        shadowBlur: 0,
        animation: 'fade',
        animationSpeed: 0.5
    }
]

// Google Fonts with Turkish support
export const GOOGLE_FONTS = [
    { name: 'Inter', category: 'sans-serif', url: 'Inter:wght@400;600;700' },
    { name: 'Roboto', category: 'sans-serif', url: 'Roboto:wght@400;500;700' },
    { name: 'Open Sans', category: 'sans-serif', url: 'Open+Sans:wght@400;600;700' },
    { name: 'Poppins', category: 'sans-serif', url: 'Poppins:wght@400;600;700' },
    { name: 'Montserrat', category: 'sans-serif', url: 'Montserrat:wght@400;600;700' },
    { name: 'Lato', category: 'sans-serif', url: 'Lato:wght@400;700;900' },
    { name: 'Oswald', category: 'sans-serif', url: 'Oswald:wght@400;500;700' },
    { name: 'Raleway', category: 'sans-serif', url: 'Raleway:wght@400;600;700' },
    { name: 'Nunito', category: 'sans-serif', url: 'Nunito:wght@400;600;700' },
    { name: 'Source Sans Pro', category: 'sans-serif', url: 'Source+Sans+Pro:wght@400;600;700' }
]

// System fonts (always available)
export const SYSTEM_FONTS = [
    'Impact',
    'Arial Black',
    'Georgia',
    'Times New Roman',
    'Verdana'
]

// All available fonts
export const ALL_FONTS = [
    ...GOOGLE_FONTS.map(f => f.name),
    ...SYSTEM_FONTS
]

// Generate Google Fonts URL for layout.tsx
export const getGoogleFontsUrl = (): string => {
    const families = GOOGLE_FONTS.map(f => f.url).join('&family=')
    return `https://fonts.googleapis.com/css2?family=${families}&display=swap`
}

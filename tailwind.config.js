/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // NEW BRAND COLORS
                'kado-primary': '#6366F1',
                'kado-secondary': '#EC4899',
                'kado-accent': '#F59E0B',

                // Background & Surface
                'kado-bg': '#0F172A',
                'kado-surface': '#1E293B',
                'kado-surface-hover': '#334155',
                'kado-border': '#475569',

                // Text
                'kado-text': '#F8FAFC',
                'kado-text-secondary': '#94A3B8',
                'kado-text-muted': '#64748B',

                // Status
                'kado-success': '#10B981',
                'kado-error': '#EF4444',
                'kado-warning': '#F59E0B',
                'kado-info': '#3B82F6',

                // Legacy Neon Colors (for backward compatibility)
                'neon-green': '#10B981',
                'neon-amber': '#F59E0B',
                'neon-cyan': '#3B82F6',
                'neon-magenta': '#EC4899',
                'neon-red': '#EF4444',
                'neon-blue': '#6366F1',
                'neon-pink': '#EC4899',
                'neon-purple': '#8B5CF6',

                // Background Colors (Legacy)
                'bg-void': '#0F172A',
                'bg-terminal': '#0F172A',
                'bg-card': '#1E293B',
                'bg-elevated': '#334155',
                'bg-highlight': '#475569',
            },
            fontFamily: {
                'heading': ['Outfit', 'sans-serif'],
                'body': ['Inter', 'system-ui', 'sans-serif'],
                'mono': ['JetBrains Mono', 'Consolas', 'monospace'],
                // Legacy
                'pixel': ['Outfit', 'sans-serif'],
                'terminal': ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'sm': '6px',
                'md': '12px',
                'lg': '16px',
                'xl': '24px',
            },
            animation: {
                'float': 'float 3s ease-in-out infinite',
                'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
                'bounce-in': 'bounceIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'shimmer': 'shimmer 2s infinite',
                'spin-slow': 'spin 3s linear infinite',
                // Legacy
                'gradient': 'gradient 8s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'retro-blink': 'retroBlink 1s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0.4)' },
                    '50%': { boxShadow: '0 0 20px 5px rgba(99, 102, 241, 0.2)' },
                },
                bounceIn: {
                    '0%': { transform: 'scale(0.8)', opacity: '0' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                slideUp: {
                    'from': { opacity: '0', transform: 'translateY(20px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                retroBlink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
            },
            boxShadow: {
                'glow-primary': '0 0 20px rgba(99, 102, 241, 0.3)',
                'glow-secondary': '0 0 20px rgba(236, 72, 153, 0.3)',
                'glow-accent': '0 0 20px rgba(245, 158, 11, 0.3)',
            },
            screens: {
                'xs': '475px',
            },
        },
    },
    plugins: [],
}

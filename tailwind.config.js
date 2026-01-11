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
                // Retro Neon Colors
                'neon-green': '#00ff41',
                'neon-amber': '#ffb000',
                'neon-cyan': '#00ffff',
                'neon-magenta': '#ff00ff',
                'neon-red': '#ff0040',
                'neon-blue': '#0080ff',
                'neon-pink': '#ff69b4',

                // Background Colors
                'bg-void': '#000000',
                'bg-terminal': '#0a0a0f',
                'bg-card': '#0d1117',
                'bg-elevated': '#161b22',
                'bg-highlight': '#1f2937',

                // Legacy colors (for compatibility)
                primary: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    200: '#bbf7d0',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#00ff41',
                    600: '#00cc33',
                    700: '#00992a',
                    800: '#006620',
                    900: '#003310',
                },
                accent: {
                    pink: '#ff69b4',
                    purple: '#ff00ff',
                    cyan: '#00ffff',
                },
                dark: {
                    100: '#1e1e2e',
                    200: '#0d1117',
                    300: '#0a0a0f',
                    400: '#000000',
                }
            },
            fontFamily: {
                'pixel': ['"Press Start 2P"', 'cursive'],
                'terminal': ['VT323', 'monospace'],
                'mono': ['"JetBrains Mono"', '"Space Mono"', 'Consolas', 'monospace'],
            },
            animation: {
                'gradient': 'gradient 8s linear infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'retro-blink': 'retroBlink 1s ease-in-out infinite',
                'glitch': 'glitch 0.3s linear',
                'neon-pulse': 'neonPulse 2s ease-in-out infinite',
            },
            keyframes: {
                gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                retroBlink: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                glitch: {
                    '0%': { transform: 'translate(0)' },
                    '20%': { transform: 'translate(-3px, 3px)' },
                    '40%': { transform: 'translate(3px, -3px)' },
                    '60%': { transform: 'translate(-3px, -3px)' },
                    '80%': { transform: 'translate(3px, 3px)' },
                    '100%': { transform: 'translate(0)' },
                },
                neonPulse: {
                    '0%, 100%': {
                        textShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 20px currentColor',
                    },
                    '50%': {
                        textShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px currentColor, 0 0 80px currentColor',
                    },
                },
            },
            backgroundSize: {
                '300%': '300%',
            },
            screens: {
                'xs': '475px',
            },
        },
    },
    plugins: [],
}

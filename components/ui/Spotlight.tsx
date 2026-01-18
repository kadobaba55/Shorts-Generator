'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SpotlightProps {
    className?: string
    fill?: string
}

export function Spotlight({ className, fill = 'white' }: SpotlightProps) {
    const divRef = useRef<HTMLDivElement>(null)
    const [isFocused, setIsFocused] = useState(false)

    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const springConfig = { damping: 20, stiffness: 300 }
    const smoothMouseX = useSpring(mouseX, springConfig)
    const smoothMouseY = useSpring(mouseY, springConfig)

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const { left, top } = divRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
            mouseX.set(e.clientX - left)
            mouseY.set(e.clientY - top)
        },
        [mouseX, mouseY]
    )

    const handleFocus = () => setIsFocused(true)
    const handleBlur = () => setIsFocused(false)

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleFocus}
            onMouseLeave={handleBlur}
            className="absolute inset-0 overflow-hidden pointer-events-none"
        >
            <motion.div
                className={cn(
                    'pointer-events-none absolute z-10 h-[500px] w-[500px] rounded-full opacity-0 transition-opacity duration-500',
                    isFocused && 'opacity-100',
                    className
                )}
                style={{
                    background: useMotionTemplate`radial-gradient(400px circle at ${smoothMouseX}px ${smoothMouseY}px, ${fill}15, transparent 80%)`,
                    left: '-250px',
                    top: '-250px',
                    transform: useMotionTemplate`translate(${smoothMouseX}px, ${smoothMouseY}px)`,
                }}
            />
        </div>
    )
}

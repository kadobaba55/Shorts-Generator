'use client'

import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {
    scene: string
    className?: string
    onLoad?: (splineApp: any) => void
}

export function SplineScene({ scene, className, onLoad }: SplineSceneProps) {
    return (
        <Suspense
            fallback={
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-kado-primary border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <Spline scene={scene} className={className} onLoad={onLoad} />
        </Suspense>
    )
}

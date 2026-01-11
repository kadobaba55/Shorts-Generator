'use client'

interface SkeletonProps {
    className?: string
    variant?: 'text' | 'circular' | 'rectangular'
    animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
    className = '',
    variant = 'rectangular',
    animation = 'pulse'
}: SkeletonProps) {
    const baseClasses = 'bg-gray-800'
    const animationClass = animation === 'pulse' ? 'animate-pulse' : animation === 'wave' ? 'animate-shimmer' : ''
    const variantClass = variant === 'circular' ? 'rounded-full' : variant === 'text' ? 'rounded h-4' : 'rounded'

    return (
        <div className={`${baseClasses} ${animationClass} ${variantClass} ${className}`} />
    )
}

// Pre-built skeleton patterns
export function VideoCardSkeleton() {
    return (
        <div className="border border-gray-800 p-4 space-y-3">
            <Skeleton className="aspect-video w-full" />
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
        </div>
    )
}

export function ClipListSkeleton() {
    return (
        <div className="space-y-2">
            {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-800 p-3 space-y-2">
                    <Skeleton variant="text" className="w-1/3" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            ))}
        </div>
    )
}

export function PageLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-bg-terminal p-8 space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <Skeleton className="w-32 h-10" />
                <div className="flex gap-4">
                    <Skeleton className="w-24 h-8" />
                    <Skeleton className="w-24 h-8" />
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="max-w-4xl mx-auto space-y-6">
                <Skeleton className="w-64 h-12 mx-auto" />
                <Skeleton variant="text" className="w-96 mx-auto" />
                <Skeleton className="w-full h-12 max-w-md mx-auto" />
            </div>

            {/* Terminal hint */}
            <div className="text-center font-mono text-xs text-gray-600 animate-pulse">
                INITIALIZING_SYSTEM...
            </div>
        </div>
    )
}

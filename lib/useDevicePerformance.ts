'use client'

import { useState, useEffect } from 'react'

interface DevicePerformance {
    isMobile: boolean
    isLowPerformance: boolean
    shouldShow3D: boolean
}

export function useDevicePerformance(): DevicePerformance {
    const [performance, setPerformance] = useState<DevicePerformance>({
        isMobile: false,
        isLowPerformance: false,
        shouldShow3D: true, // Default to true, will be updated on client
    })

    useEffect(() => {
        // Check if mobile device
        const checkMobile = () => {
            const userAgent = navigator.userAgent.toLowerCase()
            const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'opera mini', 'iemobile']
            const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
            const isMobileWidth = window.innerWidth < 768
            return isMobileUA || isMobileWidth
        }

        // Check for low performance indicators
        const checkLowPerformance = () => {
            // Check hardware concurrency (CPU cores)
            const cpuCores = navigator.hardwareConcurrency || 4
            const lowCPU = cpuCores <= 2

            // Check device memory (if available)
            const deviceMemory = (navigator as any).deviceMemory || 4
            const lowMemory = deviceMemory <= 2

            // Check for battery saver mode (if available)
            const connection = (navigator as any).connection
            const saveData = connection?.saveData || false

            // Check WebGL support and performance
            let lowGPU = false
            try {
                const canvas = document.createElement('canvas')
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
                if (gl) {
                    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
                    if (debugInfo) {
                        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                        // Check for software renderers or integrated graphics
                        const lowPerformanceGPUs = ['swiftshader', 'llvmpipe', 'softpipe', 'mesa', 'intel hd', 'intel(r) hd']
                        lowGPU = lowPerformanceGPUs.some(gpu => renderer.toLowerCase().includes(gpu))
                    }
                } else {
                    lowGPU = true // No WebGL support
                }
            } catch {
                lowGPU = false // Can't determine, assume OK
            }

            return lowCPU || lowMemory || saveData || lowGPU
        }

        const isMobile = checkMobile()
        const isLowPerformance = checkLowPerformance()
        const shouldShow3D = !isMobile && !isLowPerformance

        setPerformance({
            isMobile,
            isLowPerformance,
            shouldShow3D,
        })

        // Also listen for resize events
        const handleResize = () => {
            const isMobileNow = window.innerWidth < 768
            setPerformance(prev => ({
                ...prev,
                isMobile: isMobileNow,
                shouldShow3D: !isMobileNow && !prev.isLowPerformance,
            }))
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return performance
}

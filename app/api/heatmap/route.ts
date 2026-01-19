import { NextRequest, NextResponse } from 'next/server'

interface HeatmapMarker {
    startMillis: number
    endMillis: number
    intensityScoreNormalized: number
}

interface HeatmapData {
    heatMarkers: HeatmapMarker[]
    durationMillis: number
}

/**
 * Server-side YouTube heatmap fetcher
 * This bypasses CORS by making the request from the server
 */
export async function POST(request: NextRequest) {
    try {
        const { videoId } = await request.json()

        if (!videoId) {
            return NextResponse.json(
                { error: 'Video ID gerekli' },
                { status: 400 }
            )
        }

        console.log(`🔍 Fetching heatmap for video: ${videoId}`)

        // Fetch YouTube watch page
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
        const response = await fetch(watchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            }
        })

        if (!response.ok) {
            console.warn(`YouTube fetch failed: ${response.status}`)
            return NextResponse.json(
                { error: 'YouTube sayfası alınamadı', heatmap: null },
                { status: 200 } // Return 200 but with null heatmap
            )
        }

        const html = await response.text()

        // Extract ytInitialData from the page
        const ytInitialDataMatch = html.match(/var ytInitialData = ({.*?});/)
        if (!ytInitialDataMatch) {
            console.warn('ytInitialData not found in page')
            return NextResponse.json({ heatmap: null })
        }

        try {
            const ytInitialData = JSON.parse(ytInitialDataMatch[1])

            // Navigate to the heatmap data (Most Replayed section)
            const playerOverlays = ytInitialData?.playerOverlays?.playerOverlayRenderer
            const decoratedPlayerBar = playerOverlays?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer
            const playerBar = decoratedPlayerBar?.playerBar?.multiMarkersPlayerBarRenderer

            if (!playerBar?.markersMap) {
                console.log('No heatmap markers found for this video')
                return NextResponse.json({ heatmap: null })
            }

            // Find the HEATSEEKER marker (Most Replayed data)
            const heatseeker = playerBar.markersMap.find(
                (m: any) => m.key === 'HEATSEEKER'
            )

            if (!heatseeker?.value?.heatmap?.heatmapRenderer?.heatMarkers) {
                console.log('No HEATSEEKER data found')
                return NextResponse.json({ heatmap: null })
            }

            const heatMarkers = heatseeker.value.heatmap.heatmapRenderer.heatMarkers.map(
                (marker: any) => ({
                    startMillis: marker.heatMarkerRenderer.timeRangeStartMillis,
                    endMillis: marker.heatMarkerRenderer.markerDurationMillis + marker.heatMarkerRenderer.timeRangeStartMillis,
                    intensityScoreNormalized: marker.heatMarkerRenderer.heatMarkerIntensityScoreNormalized
                })
            )

            const heatmapData: HeatmapData = {
                heatMarkers,
                durationMillis: heatseeker.value.heatmap.heatmapRenderer.maxHeightDp || 0
            }

            console.log(`✅ Heatmap fetched: ${heatMarkers.length} markers`)

            return NextResponse.json({ heatmap: heatmapData })
        } catch (parseError) {
            console.error('Failed to parse ytInitialData:', parseError)
            return NextResponse.json({ heatmap: null })
        }
    } catch (error) {
        console.error('Heatmap fetch error:', error)
        return NextResponse.json(
            { error: 'Heatmap alınamadı', heatmap: null },
            { status: 200 }
        )
    }
}

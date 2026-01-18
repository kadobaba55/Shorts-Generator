/**
 * YouTube Heatmap Fetcher - Client-side utility
 * Fetches "Most Replayed" heatmap data from YouTube videos
 * This runs in the browser to bypass VPS IP restrictions
 */

export interface HeatmapPoint {
    startMillis: number
    endMillis: number
    intensityScoreNormalized: number
}

export interface HeatmapData {
    heatMarkers: HeatmapPoint[]
    maxHeightDp: number
    minHeightDp: number
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/
    ]

    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * Fetch YouTube heatmap data from the browser
 * This makes a request to YouTube's internal API to get "Most Replayed" data
 */
export async function fetchYouTubeHeatmap(videoId: string): Promise<HeatmapData | null> {
    try {
        // Fetch the YouTube watch page to get the initial data
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        })

        if (!response.ok) {
            console.error('Failed to fetch YouTube page:', response.status)
            return null
        }

        const html = await response.text()

        // Extract ytInitialData from the page
        const dataMatch = html.match(/var ytInitialData = ({.*?});/)
        if (!dataMatch) {
            console.error('Could not find ytInitialData')
            return null
        }

        const ytData = JSON.parse(dataMatch[1])

        // Navigate to the heatmap data
        // Path: playerOverlays.playerOverlayRenderer.decoratedPlayerBarRenderer.decoratedPlayerBarRenderer.playerBar.multiMarkersPlayerBarRenderer.markersMap
        const playerOverlays = ytData?.playerOverlays?.playerOverlayRenderer
        const decoratedBar = playerOverlays?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer
        const playerBar = decoratedBar?.playerBar?.multiMarkersPlayerBarRenderer
        const markersMap = playerBar?.markersMap

        if (!markersMap) {
            console.log('No heatmap markers found - video may not have "Most Replayed" data')
            return null
        }

        // Find the HEATSEEKER marker (Most Replayed)
        const heatseekerMarker = markersMap.find((m: any) => m.key === 'HEATSEEKER')
        if (!heatseekerMarker) {
            console.log('HEATSEEKER marker not found')
            return null
        }

        const heatmap = heatseekerMarker.value?.heatmap?.heatmapRenderer
        if (!heatmap) {
            console.log('Heatmap renderer not found')
            return null
        }

        return {
            heatMarkers: heatmap.heatMarkers?.map((marker: any) => ({
                startMillis: marker.heatMarkerRenderer?.timeRangeStartMillis || 0,
                endMillis: (marker.heatMarkerRenderer?.timeRangeStartMillis || 0) + (marker.heatMarkerRenderer?.markerDurationMillis || 0),
                intensityScoreNormalized: marker.heatMarkerRenderer?.heatMarkerIntensityScoreNormalized || 0
            })) || [],
            maxHeightDp: heatmap.maxHeightDp || 40,
            minHeightDp: heatmap.minHeightDp || 4
        }
    } catch (error) {
        console.error('Error fetching YouTube heatmap:', error)
        return null
    }
}

/**
 * Convert heatmap data to the format expected by the analyze API
 */
export function convertHeatmapForApi(heatmapData: HeatmapData): Array<{ start_time: number, end_time: number, value: number }> {
    return heatmapData.heatMarkers.map(marker => ({
        start_time: marker.startMillis / 1000,
        end_time: marker.endMillis / 1000,
        value: marker.intensityScoreNormalized
    }))
}

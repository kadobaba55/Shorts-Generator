import { NextRequest, NextResponse } from 'next/server'
import { deleteFileFromR2 } from '@/lib/storage'

export async function POST(request: NextRequest) {
    try {
        const { videoPath } = await request.json()

        if (!videoPath) {
            return NextResponse.json({ error: 'Video path required' }, { status: 400 })
        }

        // If it's a full URL, try to extract key, otherwise use as is
        let key = videoPath
        if (videoPath.startsWith('http')) {
            // Basic extraction helper logic inline or import
            // If we assume library handles it or we do it here.
            // Let's implement robust getKey here or reuse lib if possible.
            // In lib/storage.ts we only exported upload/delete.
            // We can assume deleteFileFromR2 handles keys.
            try {
                const url = new URL(videoPath)
                // pathname: /uploads/xyz.mp4 or /cuts/xyz.mp4
                // remove leading slash
                key = url.pathname.slice(1)
            } catch (e) {
                // Not a valid URL, treat as key
            }
        }

        console.log('Cleaning up file:', key)
        const success = await deleteFileFromR2(key)

        // Also try to cleanup related files if possible?
        // e.g. if key is uploads/123.mp4, maybe there's cuts/123_clip_1.mp4?
        // Without listing, we can't be sure.
        // For now, minimal scope: delete the current video.

        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'

// Initialize S3 Client (R2)
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
    }
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'shorts-bucket'
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '' // e.g. https://pub-xxxx.r2.dev

const QUOTA_LIMIT_BYTES = 100 * 1024 * 1024 * 1024 // 100 GB
const QUOTA_TARGET_BYTES = 90 * 1024 * 1024 * 1024 // 90 GB target after cleanup
const CHECK_COOLDOWN_MS = 5 * 60 * 1000 // Check at most every 5 minutes

let lastCheckTime = 0
let isChecking = false

async function checkAndEnforceQuota() {
    // 1. Throttling & Locking
    const now = Date.now()
    if (isChecking) return // Already running
    if (now - lastCheckTime < CHECK_COOLDOWN_MS) return // Too soon

    try {
        isChecking = true
        console.log('🔍 Checking R2 storage quota...')
        let continuationToken: string | undefined = undefined
        let totalSize = 0
        const allObjects: { Key: string; Size: number; LastModified: Date }[] = []

        // 1. List all objects
        do {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken
            })
            const response = await s3Client.send(command) as any

            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (obj.Key && obj.Size !== undefined && obj.LastModified) {
                        totalSize += obj.Size
                        allObjects.push({
                            Key: obj.Key,
                            Size: obj.Size,
                            LastModified: obj.LastModified
                        })
                    }
                }
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
        } while (continuationToken)

        console.log(`📊 Current R2 Usage: ${(totalSize / 1024 / 1024).toFixed(2)} MB / ${(QUOTA_LIMIT_BYTES / 1024 / 1024).toFixed(2)} MB`)

        // 2. Check if over limit
        if (totalSize > QUOTA_LIMIT_BYTES) {
            console.log('⚠️ Quota exceeded! Starting cleanup...')

            // Sort by oldest first
            allObjects.sort((a, b) => a.LastModified.getTime() - b.LastModified.getTime())

            let deletedSize = 0
            const deletedCount = 0

            for (const obj of allObjects) {
                if (totalSize - deletedSize <= QUOTA_TARGET_BYTES) {
                    break // Target reached
                }

                console.log(`🗑️ Deleting old file: ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)} MB)`)
                await deleteFileFromR2(obj.Key)
                deletedSize += obj.Size
            }

            console.log(`✅ Cleanup complete. Freed ${(deletedSize / 1024 / 1024).toFixed(2)} MB.`)
        }

        lastCheckTime = Date.now()
    } catch (error) {
        console.error('Quota Enforcement Error:', error)
        isChecking = false
    }
}

// Cached R2 Stats
let cachedR2Stats = {
    used: 0,
    count: 0,
    lastUpdate: 0
}
const R2_STATS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getR2Stats() {
    // If cache is valid (and not 0), return it
    const now = Date.now()
    if (cachedR2Stats.lastUpdate > 0 && (now - cachedR2Stats.lastUpdate < R2_STATS_CACHE_TTL)) {
        return cachedR2Stats
    }

    try {
        let continuationToken: string | undefined = undefined
        let totalSize = 0
        let count = 0

        do {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                ContinuationToken: continuationToken
            })
            const response = await s3Client.send(command) as any

            if (response.Contents) {
                for (const obj of response.Contents) {
                    if (obj.Size !== undefined) {
                        totalSize += obj.Size
                        count++
                    }
                }
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
        } while (continuationToken)

        cachedR2Stats = {
            used: totalSize,
            count: count,
            lastUpdate: now
        }
        return cachedR2Stats
    } catch (error) {
        console.error('Failed to get R2 stats:', error)
        return { used: 0, count: 0, lastUpdate: 0 }
    }
}



export async function uploadFileToR2(filePath: string, key: string, contentType: string = 'video/mp4') {
    try {
        const fileStream = fs.createReadStream(filePath)

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileStream,
            ContentType: contentType
        })

        await s3Client.send(command)

        // Trigger quota check in background (fire and forget)
        checkAndEnforceQuota().catch(err => console.error('Background quota check failed:', err))

        return `${PUBLIC_URL}/${key}`
    } catch (error) {
        console.error('R2 Upload Error:', error)
        throw error
    }
}

export async function deleteFileFromR2(key: string) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        })
        await s3Client.send(command)
        return true
    } catch (error) {
        console.error('R2 Delete Error:', error)
        return false // Don't crash for delete errors
    }
}

// Storage Mode Logic
import { prisma } from './prisma'

export async function getStorageMode(): Promise<'cloud' | 'local'> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'storage_mode' }
        })

        // Default to cloud if R2 keys present, else local
        if (!setting) {
            return (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) ? 'cloud' : 'local'
        }

        return setting.value as 'cloud' | 'local'
    } catch (error) {
        console.error('Failed to get storage mode, defaulting to cloud/local based on env')
        return (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) ? 'cloud' : 'local'
    }
}

export async function handleClipStorage(filePath: string, key: string): Promise<string> {
    const mode = await getStorageMode()

    if (mode === 'cloud') {
        const url = await uploadFileToR2(filePath, key)
        // If uploaded successfully, delete local file
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        } catch (e) {
            console.error('Failed to delete local file after upload:', e)
        }
        return url
    } else {
        // Local mode: File is expected to be in public/output already (or we move it there)
        // In api/process, files are generated in specific output dir.
        // We just return the local URL.
        // We assume 'key' contains the filename relative to storage root.
        // If key is 'cuts/xyz.mp4', we might want to ensure it is in public/output/cuts?
        // App logic uses public/output flatly usually?
        // Let's check api/process again. It uses `outputId_clip_i.mp4` in `OUTPUT_DIR`.
        // `storage.uploadFileToR2` was passed `filename = cuts/...`.
        // If Local, we might want to move it to `public/output/cuts` or just `public/output`?
        // To keep URLs consistent, if the frontend expects `/cuts/...`, we should move it.
        // But `api/process` generated it in `OUTPUT_DIR` (public/output).

        // If we switch to local, we simply return the path relative to public.
        // If the file is already at `filePath`, we just derive the URL.
        // `filePath` is absolute path in `public`.

        // However, `api/process` was constructing `filename` as `cuts/...`. 
        // If we want to emulate R2 structure locally, we should move it to `public/cuts`?
        // Let's stick to `public/output` if possible or just mirror the key structure.

        const publicDir = path.join(process.cwd(), 'public')
        const targetPath = path.join(publicDir, key)
        const targetDir = path.dirname(targetPath)

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
        }

        // Move file if it's not already there
        if (filePath !== targetPath) {
            fs.renameSync(filePath, targetPath)
        }

        return `/${key}`
    }
}

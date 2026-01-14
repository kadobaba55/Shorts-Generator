import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import fs from 'fs'

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
    } finally {
        isChecking = false
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

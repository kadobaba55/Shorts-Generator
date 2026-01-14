import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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

        // Return the public URL
        // If PUBLIC_URL is missing, this will return just the slash path, which won't work 
        // unless frontend handles it. But we expect PUBLIC_URL to be set.
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

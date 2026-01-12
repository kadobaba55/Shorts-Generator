import { Storage } from '@google-cloud/storage'
import path from 'path'

import fs from 'fs'

// Credentials path
const KEY_PATH = path.join(process.cwd(), 'google-credentials.json')
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'shorts-bucket-v1'

let storage: Storage | null = null

try {
    // Eğer dosya varsa onu kullan, yoksa sunucu kimliğini (GCE) kullan
    const options: any = {
        projectId: process.env.GCS_PROJECT_ID
    }

    if (fs.existsSync(KEY_PATH)) {
        options.keyFilename = KEY_PATH
    }

    storage = new Storage(options)
    console.log('✅ Google Cloud Storage başlatıldı (Mod:', fs.existsSync(KEY_PATH) ? 'Key File' : 'Auto Discovery', ')')
} catch (error) {
    console.warn('Google Cloud Storage uyarısı:', error)
}

export async function uploadToStorage(filePath: string, destination: string): Promise<string> {
    if (!storage) throw new Error('Storage başlatılamadı. Google Credentials dosyasını kontrol et.')

    const bucket = storage.bucket(BUCKET_NAME)

    // Upload options
    const [file] = await bucket.upload(filePath, {
        destination,
        public: true, // Dosyayı public yap
        metadata: {
            cacheControl: 'public, max-age=31536000',
        },
    })

    return file.publicUrl()
}

export async function deleteFromStorage(filename: string) {
    if (!storage) return

    try {
        await storage.bucket(BUCKET_NAME).file(filename).delete()
    } catch (error) {
        console.error('GCS Silme Hatası:', error)
    }
}

export function getPublicUrl(filename: string) {
    return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`
}

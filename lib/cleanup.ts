import fs from 'fs'
import path from 'path'

// Temizlenecek klasörler
const TARGET_DIRS = [
    'public/temp',
    'public/output'
]

// Dosya ömrü (Milisaniye cinsinden) - Varsayılan: 24 Saat
const MAX_FILE_AGE = 24 * 60 * 60 * 1000

export async function cleanupOldFiles() {
    console.log('🧹 [Cleanup] Starting cleanup routine...')
    const now = Date.now()
    let deletedCount = 0
    let recoveredSpace = 0

    for (const dir of TARGET_DIRS) {
        const absoluteDir = path.join(process.cwd(), dir)

        if (!fs.existsSync(absoluteDir)) {
            console.warn(`⚠️ [Cleanup] Directory not found: ${absoluteDir}`)
            continue
        }

        try {
            const files = fs.readdirSync(absoluteDir)

            for (const file of files) {
                // .gitkeep veya özel dosyaları koru
                if (file === '.gitkeep') continue

                const filePath = path.join(absoluteDir, file)
                const stats = fs.statSync(filePath)

                // Klasörleri atla (şimdilik sadece dosyalar)
                if (stats.isDirectory()) continue

                const age = now - stats.mtimeMs

                if (age > MAX_FILE_AGE) {
                    // Dosyayı sil
                    const size = stats.size
                    fs.unlinkSync(filePath)

                    deletedCount++
                    recoveredSpace += size
                    console.log(`🗑️ [Cleanup] Deleted: ${file} (${(size / 1024 / 1024).toFixed(2)} MB)`)
                }
            }
        } catch (error) {
            console.error(`❌ [Cleanup] Error in directory ${dir}:`, error)
        }
    }

    const mbRecovered = (recoveredSpace / 1024 / 1024).toFixed(2)
    console.log(`✅ [Cleanup] Finished. Deleted ${deletedCount} files. Recovered ${mbRecovered} MB.`)

    return {
        deletedCount,
        recoveredSpace: mbRecovered
    }
}

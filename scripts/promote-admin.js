const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]
    if (!email) {
        console.error('Usage: node scripts/promote-admin.js <email>')
        console.error('Example: node scripts/promote-admin.js admin@example.com')
        process.exit(1)
    }

    try {
        console.log(`Searching for user: ${email}...`)
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' }
        })
        console.log(`✅ User updated to ADMIN: ${user.email}`)
        console.log(`🎉 Artık ${email} hesabı ile /admin paneline giriş yapabilirsiniz.`)
    } catch (error) {
        // console.error('Error details:', error)
        if (error.code === 'P2025') {
            console.error('❌ Hata: Bu email adresi ile kayıtlı kullanıcı bulunamadı.')
            console.error('Lütfen önce siteye kayıt olun, sonra bu komutu çalıştırın.')
        } else {
            console.error('❌ Beklenmeyen bir hata oluştu:', error.message)
        }
    } finally {
        await prisma.$disconnect()
    }
}

main()

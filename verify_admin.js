const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@kado.app' },
        select: { email: true, role: true }
    })
    console.log("DB Verification:", user)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

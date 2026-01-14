const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || 'admin@kado.app';
    console.log(`Checking for user: ${email}`);
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (user) {
            console.log('User found:', {
                id: user.id,
                email: user.email,
                passwordHash: user.password ? user.password.substring(0, 10) + '...' : 'null',
                role: user.role,
            });
        } else {
            console.log('User NOT found.');
        }
    } catch (error) {
        console.error('Error connecting to database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

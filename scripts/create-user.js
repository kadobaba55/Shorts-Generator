const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2] || 'admin@kado.app';
    const password = process.argv[3] || 'password123';

    console.log(`Creating user: ${email}`);

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
            },
            create: {
                email,
                name: 'Admin User',
                password: hashedPassword,
                role: 'ADMIN',
                tokens: 100,
                subscriptionPlan: 'PRO',
            },
        });

        console.log('User created/updated successfully:', user);
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

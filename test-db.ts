import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection successful!');

    // Test creating a user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword123',
      },
    });
    console.log('User created:', user);

    // Clean up
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log('Test user deleted');

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

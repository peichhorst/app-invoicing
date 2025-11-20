import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        name: 'Demo User',
        email: 'demo@example.com',
        password: hashedPassword,
      },
    });

    const existingClient = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyName: 'Tesla',
      },
    });

    if (existingClient) {
      console.log('Client already exists (Tesla)');
      return;
    }

    const client = await prisma.client.create({
      data: {
        userId: user.id,
        companyName: 'Tesla',
        contactName: 'Elon Musk',
        email: 'elon@tesla.com',
        phone: '+1 555-123-4567',
        addressLine1: '1 Tesla Road',
        city: 'Austin',
        state: 'TX',
        postalCode: '78725',
        country: 'US',
        notes: 'Preferred client',
      },
    });
    console.log('Client added:', client.companyName);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});

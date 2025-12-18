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

    // Ensure user has a company
    const company =
      (user.companyId && (await prisma.company.findUnique({ where: { id: user.companyId } }))) ||
      (await prisma.company.create({
        data: {
          name: 'Demo Company',
          ownerId: user.id,
        },
      }));

    // backfill companyId on user if missing
    if (!user.companyId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { companyId: company.id },
      });
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        companyId: company.id,
        companyName: 'Tesla',
      },
    });

    if (existingClient) {
      console.log('Client already exists (Tesla)');
      return;
    }

    const client = await prisma.client.create({
      data: {
        companyId: company.id,
        assignedToId: user.id,
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

    // Seed default positions for all companies
    const companies = await prisma.company.findMany();
    
    const defaultPositions = [
      { name: 'Executive', order: 1 },
      { name: 'Director', order: 2 },
      { name: 'Manager', order: 3 },
      { name: 'Team Lead', order: 4 },
      { name: 'Senior', order: 5 },
      { name: 'Associate', order: 6 },
      { name: 'Junior', order: 7 },
      { name: 'Intern', order: 8 },
    ];

    for (const company of companies) {
      for (const position of defaultPositions) {
        await prisma.position.upsert({
          where: {
            companyId_name: {
              companyId: company.id,
              name: position.name,
            },
          },
          update: {},
          create: {
            companyId: company.id,
            name: position.name,
            order: position.order,
            isCustom: false,
          },
        });
      }
    }

    console.log('Default positions seeded for all companies');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});

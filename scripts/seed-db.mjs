import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@example.com',
      password: hashedPassword,
      role: 'OWNER',
      isConfirmed: true,
      timezone: 'America/New_York',
    },
  });

  console.log('✓ User created/found:', user.email);

  // Ensure user has a company
  let company = user.companyId ? await prisma.company.findUnique({ where: { id: user.companyId } }) : null;
  
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Demo Company',
        ownerId: user.id,
        primaryColor: '#3b82f6',
        revenueGoalMonthly: 25000,
        revenueGoalQuarterly: 75000,
        revenueGoalYearly: 300000,
      },
    });
    
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    });
    
    console.log('✓ Company created:', company.name);
  }

  // Create clients
  const clientsData = [
    {
      companyName: 'Acme Corporation',
      contactName: 'John Smith',
      email: 'john@acme.com',
      phone: '+1 555-100-2000',
      city: 'New York',
      state: 'NY',
      isLead: false,
    },
    {
      companyName: 'BlueSky Industries',
      contactName: 'Sarah Johnson',
      email: 'sarah@bluesky.com',
      phone: '+1 555-200-3000',
      city: 'San Francisco',
      state: 'CA',
      isLead: false,
    },
    {
      companyName: 'GreenLeaf Consulting',
      contactName: 'Mike Chen',
      email: 'mike@greenleaf.co',
      phone: '+1 555-300-4000',
      city: 'Portland',
      state: 'OR',
      isLead: false,
    },
    {
      companyName: 'TechStart Ventures',
      contactName: 'Emily Rodriguez',
      email: 'emily@techstart.io',
      city: 'Austin',
      state: 'TX',
      isLead: true,
    },
  ];

  const clients = [];
  for (const data of clientsData) {
    const existing = await prisma.client.findFirst({
      where: {
        companyId: company.id,
        companyName: data.companyName,
      },
    });

    if (!existing) {
      const client = await prisma.client.create({
        data: {
          companyId: company.id,
          assignedToId: user.id,
          ...data,
        },
      });
      clients.push(client);
      console.log('✓ Client created:', client.companyName);
    } else {
      clients.push(existing);
    }
  }

  // Create invoices
  if (clients.length >= 2) {
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    
    const existing = await prisma.invoice.findFirst({
      where: {
        userId: user.id,
        clientId: clients[0].id,
      },
    });

    if (!existing) {
      await prisma.invoice.create({
        data: {
          userId: user.id,
          clientId: clients[0].id,
          invoiceNumber,
          title: 'Website Redesign Project',
          status: 'PAID',
          issueDate: new Date('2025-12-01'),
          dueDate: new Date('2025-12-15'),
          subTotal: 12000,
          taxRate: 0.08,
          taxAmount: 960,
          total: 12960,
          amountPaid: 12960,
          items: {
            create: [
              {
                name: 'Design Mockups',
                description: 'Initial design concepts',
                quantity: 1,
                unitPrice: 2500,
                amount: 2500,
              },
              {
                name: 'Frontend Development',
                description: 'HTML, CSS, JavaScript',
                quantity: 40,
                unitPrice: 150,
                amount: 6000,
              },
              {
                name: 'Backend Integration',
                description: 'API and database',
                quantity: 20,
                unitPrice: 175,
                amount: 3500,
              },
            ],
          },
        },
      });
      console.log('✓ Sample invoice created');
    }
  }

  // Create availability schedule
  const hasAvailability = await prisma.availability.findFirst({
    where: { userId: user.id },
  });

  if (!hasAvailability) {
    await prisma.availability.createMany({
      data: [
        { userId: user.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 5, startTime: '09:00', endTime: '16:00' },
      ],
    });
    console.log('✓ Availability schedule created');
  }

  console.log('\n✅ Database seed completed successfully!');
  console.log('\nLogin with:');
  console.log('  Email: demo@example.com');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

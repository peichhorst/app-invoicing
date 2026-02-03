import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

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
        role: 'OWNER',
        isConfirmed: true,
        timezone: 'America/New_York',
      },
    });

    // Ensure user has a company
    const company =
      (user.companyId && (await prisma.company.findUnique({ where: { id: user.companyId } }))) ||
      (await prisma.company.create({
        data: {
          name: 'Demo Company',
          ownerId: user.id,
          primaryColor: '#3b82f6',
          revenueGoalMonthly: 25000,
          revenueGoalQuarterly: 75000,
          revenueGoalYearly: 300000,
        },
      }));

    // backfill companyId on user if missing
    if (!user.companyId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          companyId: company.id,
          role: 'OWNER',
        },
      });
    }

    // Create sample clients
    const clients = [
      {
        companyName: 'Acme Corporation',
        contactName: 'John Smith',
        email: 'john@acme.com',
        phone: '+1 555-100-2000',
        addressLine1: '123 Business Ave',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        notes: 'Tech startup - prefers video meetings',
        isLead: false,
      },
      {
        companyName: 'BlueSky Industries',
        contactName: 'Sarah Johnson',
        email: 'sarah@bluesky.com',
        phone: '+1 555-200-3000',
        addressLine1: '456 Innovation Pkwy',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        notes: 'Large contract - NET 30 terms',
        isLead: false,
      },
      {
        companyName: 'GreenLeaf Consulting',
        contactName: 'Mike Chen',
        email: 'mike@greenleaf.co',
        phone: '+1 555-300-4000',
        addressLine1: '789 Eco Drive',
        city: 'Portland',
        state: 'OR',
        postalCode: '97201',
        country: 'US',
        notes: 'Monthly retainer client',
        isLead: false,
      },
      {
        companyName: 'TechStart Ventures',
        contactName: 'Emily Rodriguez',
        email: 'emily@techstart.io',
        phone: '+1 555-400-5000',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'US',
        notes: 'New lead from referral',
        isLead: true,
      },
    ];

    const createdClients: any[] = [];
    for (const clientData of clients) {
      const existing = await prisma.client.findFirst({
        where: {
          companyId: company.id,
          companyName: clientData.companyName,
        },
      });

      if (!existing) {
        const client = await prisma.client.create({
          data: {
            companyId: company.id,
            assignedToId: user.id,
            ...clientData,
          },
        });
        createdClients.push(client);
        console.log('Client added:', client.companyName);
      } else {
        createdClients.push(existing);
      }
    }

    // Create sample invoices
    const invoices = [
      {
        client: createdClients[0],
        title: 'Website Redesign Project',
        status: 'PAID',
        issueDate: new Date('2025-12-01'),
        dueDate: new Date('2025-12-15'),
        items: [
          { name: 'Design Mockups', description: 'Initial design concepts and mockups', quantity: 1, unitPrice: 2500, amount: 2500 },
          { name: 'Frontend Development', description: 'HTML, CSS, JavaScript implementation', quantity: 40, unitPrice: 150, amount: 6000 },
          { name: 'Backend Integration', description: 'API integration and database setup', quantity: 20, unitPrice: 175, amount: 3500 },
        ],
      },
      {
        client: createdClients[1],
        title: 'December Consulting Services',
        status: 'PAID',
        issueDate: new Date('2025-12-01'),
        dueDate: new Date('2026-01-01'),
        items: [
          { name: 'Strategic Consulting', description: 'Business strategy and planning sessions', quantity: 30, unitPrice: 200, amount: 6000 },
          { name: 'Implementation Support', description: 'Technical implementation guidance', quantity: 15, unitPrice: 175, amount: 2625 },
        ],
      },
      {
        client: createdClients[2],
        title: 'January Monthly Retainer',
        status: 'SENT',
        issueDate: new Date('2026-01-01'),
        dueDate: new Date('2026-01-31'),
        items: [
          { name: 'Monthly Retainer', description: 'Ongoing support and maintenance - January 2026', quantity: 1, unitPrice: 5000, amount: 5000 },
        ],
      },
      {
        client: createdClients[0],
        title: 'Q1 2026 Development Sprint',
        status: 'DRAFT',
        issueDate: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
        items: [
          { name: 'Feature Development', description: 'New feature implementation', quantity: 60, unitPrice: 150, amount: 9000 },
          { name: 'Testing & QA', description: 'Quality assurance and testing', quantity: 20, unitPrice: 125, amount: 2500 },
          { name: 'Deployment', description: 'Deployment and documentation', quantity: 10, unitPrice: 150, amount: 1500 },
        ],
      },
      {
        client: createdClients[1],
        title: 'January Consulting Services',
        status: 'SENT',
        issueDate: new Date('2026-01-02'),
        dueDate: new Date('2026-02-01'),
        items: [
          { name: 'Strategic Planning', description: 'Q1 strategic planning sessions', quantity: 25, unitPrice: 200, amount: 5000 },
          { name: 'Team Training', description: 'Onboarding and team training', quantity: 8, unitPrice: 250, amount: 2000 },
        ],
      },
    ];

    let invoiceCounter = 1001;
    for (const invoiceData of invoices) {
      const existing = await prisma.invoice.findUnique({
        where: {
          userId_invoiceNumber: {
            userId: user.id,
            invoiceNumber: `INV-${invoiceCounter}`,
          },
        },
      });

      if (!existing) {
        const subTotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
        const taxRate = 0.08;
        const taxAmount = subTotal * taxRate;
        const total = subTotal + taxAmount;
        const amountPaid = invoiceData.status === 'PAID' ? total : 0;

        const invoice = await prisma.invoice.create({
          data: {
            userId: user.id,
            clientId: invoiceData.client.id,
            invoiceNumber: `INV-${invoiceCounter}`,
            title: invoiceData.title,
            status: invoiceData.status as any,
            issueDate: invoiceData.issueDate,
            dueDate: invoiceData.dueDate,
            subTotal,
            taxRate,
            taxAmount,
            total,
            amountPaid,
            items: {
              create: invoiceData.items,
            },
          },
        });
        console.log('Invoice created:', invoice.invoiceNumber);
      }
      invoiceCounter++;
    }

    // Create sample availability schedule
    const availabilityExists = await prisma.availability.findFirst({
      where: { userId: user.id },
    });

    if (!availabilityExists) {
      await prisma.availability.createMany({
        data: [
          // Monday
          { userId: user.id, dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
          { userId: user.id, dayOfWeek: 1, startTime: '13:00', endTime: '17:00' },
          // Tuesday
          { userId: user.id, dayOfWeek: 2, startTime: '09:00', endTime: '12:00' },
          { userId: user.id, dayOfWeek: 2, startTime: '13:00', endTime: '17:00' },
          // Wednesday
          { userId: user.id, dayOfWeek: 3, startTime: '09:00', endTime: '12:00' },
          { userId: user.id, dayOfWeek: 3, startTime: '13:00', endTime: '17:00' },
          // Thursday
          { userId: user.id, dayOfWeek: 4, startTime: '09:00', endTime: '12:00' },
          { userId: user.id, dayOfWeek: 4, startTime: '13:00', endTime: '17:00' },
          // Friday
          { userId: user.id, dayOfWeek: 5, startTime: '09:00', endTime: '12:00' },
          { userId: user.id, dayOfWeek: 5, startTime: '14:00', endTime: '16:00' },
        ],
      });
      console.log('Availability schedule created');
    }

    // Create a sample booking
    const bookingExists = await prisma.booking.findFirst({
      where: { userId: user.id },
    });

    if (!bookingExists && createdClients[0]) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      await prisma.booking.create({
        data: {
          userId: user.id,
          clientEmail: createdClients[0].email!,
          clientName: createdClients[0].contactName!,
          clientPhone: createdClients[0].phone,
          notes: 'Discuss Q1 project timeline',
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour later
        },
      });
      console.log('Sample booking created');
    }

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

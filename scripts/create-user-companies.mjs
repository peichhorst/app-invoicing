import 'dotenv/config';  // Loads .env.local too
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting migration...');

  try {
    const users = await prisma.user.findMany({
      where: { companyId: null },
    });

    let count = 0;
    for (const user of users) {
      if (user.role === 'OWNER') {
        const company = await prisma.company.upsert({
          where: { ownerId: user.id },
          update: {},
          create: {
            name:
              `${user.firstName || ''} ${user.lastName || ''}'s Business`.trim() ||
              'My Business',
            ownerId: user.id,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { companyId: company.id },
        });

        console.log(`Fixed: ${user.email}`);
        count++;
      }
    }

    console.log(`\nDone! Fixed ${count} owners.`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(console.error);

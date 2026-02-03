import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update all clients where source is boolean false to 'CONVERTED_FROM_LEAD'
  const result = await prisma.lead.updateMany({
    where: {
      // @ts-ignore
      source: false,
    },
    data: {
      source: 'CONVERTED_FROM_LEAD',
    },
  });
  console.log(`Updated ${result.count} clients where source was boolean false.`);

  // Optionally, also update any clients where isLead is false and source is null
  const result2 = await prisma.lead.updateMany({
    where: {
      source: null,
    },
    data: {
      source: 'CONVERTED_FROM_LEAD',
    },
  });
  console.log(`Updated ${result2.count} leads where source was null.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// scripts/fix-paid-invoices-set-paidAt.ts
// Run with: npx tsx scripts/fix-paid-invoices-set-paidAt.ts
import { prisma } from '../src/lib/prisma';

async function main() {
  const updated = await prisma.invoice.updateMany({
    where: {
      status: 'PAID',
      paidAt: null,
    },
    data: {
      paidAt: { set: new Date() }, // You can change this to createdAt or updatedAt if you prefer
    },
  });
  console.log(`Updated ${updated.count} invoices to set paidAt.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

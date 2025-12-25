const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: Role.ADMIN },
    data: { role: Role.SUPERADMIN },
  });
  console.log(`Updated ${result.count} user(s) from ADMIN to SUPERADMIN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { prisma } from '@/lib/prisma';

async function main() {
  const emailToCheck = process.env.CHECK_ROLE_EMAIL;
  if (!emailToCheck) {
    throw new Error('Set CHECK_ROLE_EMAIL when running this script.');
  }

  const user = await prisma.user.findUnique({
    where: { email: emailToCheck },
    select: { id: true, role: true },
  });

  if (!user) {
    console.log(`No user found for ${emailToCheck}`);
    return;
  }

  console.log(`User ${user.id} has role ${user.role ?? 'null'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

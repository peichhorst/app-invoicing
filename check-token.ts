import { prisma } from './src/lib/prisma';

async function check() {
  const token = '3ea69f2445388751a8256237d36a7baa35858d60b00c8ee9'; // ← your token

  const result = await prisma.clientPortalUser.findFirst({
    where: { portalToken: token },
  });

  if (result) {
    console.log('TOKEN EXISTS!');
    console.log('Record:', result);
  } else {
    console.log('TOKEN DOES NOT EXIST IN DATABASE');
    console.log('Here are the first 10 real tokens in your DB:');
    const all = await prisma.clientPortalUser.findMany({
      select: { id: true, portalToken: true, client: { select: { companyName: true } } },
      take: 10,
    });
    console.table(all);
  }

  process.exit();
}

check();
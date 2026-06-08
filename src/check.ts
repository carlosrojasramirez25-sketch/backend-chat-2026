import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

async function main() {
  const dbUrl = new URL(process.env.DATABASE_URL!);
  const adapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.substring(1),
  });
  const prisma = new PrismaClient({ adapter });
  
  console.log('=== Conversations ===');
  const convos = await prisma.conversations.findMany({
    include: {
      conversations_members: {
        include: {
          users: true
        }
      }
    }
  });
  console.dir(convos, { depth: null });

  console.log('=== Messages ===');
  const messages = await prisma.messages.findMany({
    orderBy: { created_at: 'asc' }
  });
  console.dir(messages, { depth: null });

  await prisma.$disconnect();
}

main();

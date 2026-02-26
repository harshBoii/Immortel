import path from 'path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL ?? 'file:./dev.db';

function createPrismaClient() {
  if (url.startsWith('postgres')) {
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter });
  }
  // SQLite (e.g. file:./dev.db) — only if your schema provider is sqlite
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  const name = 'MoonFlare';
  const slug = 'moonflare';
  const email = 'admin@moonflare.com';
  const userName = 'admin@moonflare.com';
  const plainPassword = 'MoonFlare123!';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const company = await prisma.company.upsert({
    where: { email },
    update: {
      name,
      slug,
      userName,
      password: hashedPassword,
    },
    create: {
      name,
      slug,
      email,
      userName,
      password: hashedPassword,
      description: 'MoonFlare company',
    },
  });

  console.log('Seeded company:', company.name, '| email:', company.email, '| slug:', company.slug);
  console.log('Login with email:', email, 'and password:', plainPassword);
  console.log('(Use these credentials on /login to sign in.)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

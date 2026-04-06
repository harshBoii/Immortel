/**
 * Creates/links Organization `org123` (org login password `pass1234` by default) to companies by email.
 *
 * Run: npx tsx prisma/seed-organization.ts
 * Or:  npm run seed:organization
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";

function createPrismaClient() {
  if (url.startsWith("postgres")) {
    const adapter = new PrismaPg({ connectionString: url });
    return new PrismaClient({ adapter });
  }
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

const ORG_NAME = "org123";
/** Org login for /api/auth/login-organization → /hq when 2+ companies. */
const ORG_USERNAME = (process.env.SEED_ORG_USERNAME ?? "org123").toLowerCase();
const ORG_PASSWORD_PLAIN = process.env.SEED_ORG_PASSWORD ?? "pass1234";

/** Companies to attach; one `isOrg` HQ row is required for multi-company /hq access. */
const MEMBERS: { email: string; isOrg: boolean }[] = [
  { email: "x-company@gmail.com", isOrg: false },
  { email: "admin@momsmade", isOrg: false },
  { email: "admin@putchi", isOrg: true },
];

async function findCompanyByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return prisma.company.findFirst({
    where: {
      email: { equals: normalized, mode: "insensitive" },
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(ORG_PASSWORD_PLAIN, 10);

  let org = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: ORG_NAME,
        username: ORG_USERNAME,
        password: passwordHash,
      },
    });
    console.log("Created organization:", org.id, org.name);
  } else {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        username: ORG_USERNAME,
        password: passwordHash,
      },
    });
    org = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    console.log("Using existing organization:", org.id, org.name);
  }

  for (const { email, isOrg } of MEMBERS) {
    const existing = await findCompanyByEmail(email);
    if (!existing) {
      console.warn(`Skipping (not found): ${email}`);
      continue;
    }

    await prisma.company.update({
      where: { id: existing.id },
      data: {
        organizationId: org.id,
        isOrg,
      },
    });
    console.log(
      `Linked ${email} → org (${isOrg ? "HQ" : "subsidiary"}) id=${existing.id}`
    );
  }

  const count = await prisma.company.count({ where: { organizationId: org.id } });
  console.log(`Done. ${count} company(ies) on organization ${org.name}.`);
  console.log("HQ company: admin@putchi (isOrg) — use that session or org login for /hq.");
  console.log(
    `Org login: username=${ORG_USERNAME} (password: SEED_ORG_PASSWORD or default in script) → /login “Login as Org”`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Seed Dealify coupon codes (150 per plan).
 *
 * Usage:
 *   npx tsx scripts/seed-dealify-coupons.ts
 *
 * Optional env:
 *   DEALIFY_COUPON_EXPIRES_AT — ISO date string for coupon expiry
 */
import path from "path";
import { config } from "dotenv";
import { randomBytes } from "crypto";

config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient, SubscriptionPlan } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

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

const CODES_PER_PLAN = 150;

const PLAN_PREFIX: Record<string, string> = {
  DEALIFY_STARTER: "DFY-ST",
  DEALIFY_PRO: "DFY-PR",
};

function generateCode(prefix: string): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

async function seedPlanCoupons(plan: SubscriptionPlan, prefix: string) {
  const expiresAtRaw = process.env.DEALIFY_COUPON_EXPIRES_AT?.trim();
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAtRaw && Number.isNaN(expiresAt!.getTime())) {
    throw new Error(`Invalid DEALIFY_COUPON_EXPIRES_AT: ${expiresAtRaw}`);
  }

  const existing = await prisma.subscriptionCoupon.count({ where: { plan } });
  const toCreate = Math.max(0, CODES_PER_PLAN - existing);
  if (toCreate === 0) {
    console.log(`${plan}: already has ${existing} coupon(s), skipping`);
    return;
  }

  const codes = new Set<string>();
  while (codes.size < toCreate) {
    codes.add(generateCode(prefix));
  }

  const data = [...codes].map((code) => ({
    code,
    plan,
    expiresAt,
  }));

  const result = await prisma.subscriptionCoupon.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`${plan}: created ${result.count} coupon(s) (${existing} already existed)`);
}

async function main() {
  await seedPlanCoupons(SubscriptionPlan.DEALIFY_STARTER, PLAN_PREFIX.DEALIFY_STARTER);
  await seedPlanCoupons(SubscriptionPlan.DEALIFY_PRO, PLAN_PREFIX.DEALIFY_PRO);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

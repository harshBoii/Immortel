/**
 * Export available Dealify coupons to coupons.md
 *
 * Usage:
 *   npx tsx scripts/export-dealify-coupons-md.ts
 */
import path from "path";
import { writeFileSync } from "fs";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient, SubscriptionPlan } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  COUPON_TERM_YEARS,
  PLAN_OPTIONS,
  type DealifyPlanId,
} from "../src/lib/subscription/plans";

const url = process.env.DATABASE_URL ?? "file:./dev.db";

function createPrismaClient() {
  if (url.startsWith("postgres")) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

const prisma = createPrismaClient();

const DEALIFY_PLANS: DealifyPlanId[] = ["DEALIFY_STARTER", "DEALIFY_PRO"];

async function main() {
  const generatedAt = new Date().toISOString();
  const sections: string[] = [
    "# Dealify Coupon Codes",
    "",
    "Single-use codes for coupon-only signup. Each code grants **100% off** and a **" +
      `${COUPON_TERM_YEARS}-year` +
      "** subscription term.",
    "",
    `_Generated: ${generatedAt}_`,
    "",
    "> Regenerate after seeding or redemptions: `npx tsx scripts/export-dealify-coupons-md.ts`",
    "",
  ];

  for (const planId of DEALIFY_PLANS) {
    const option = PLAN_OPTIONS.find((p) => p.id === planId)!;
    const coupons = await prisma.subscriptionCoupon.findMany({
      where: { plan: planId as SubscriptionPlan, redeemedAt: null },
      select: { code: true },
      orderBy: { code: "asc" },
    });

    sections.push(`## ${option.name}`);
    sections.push("");
    sections.push(`- **Price:** ${option.priceLabel}`);
    sections.push(`- **Term:** ${COUPON_TERM_YEARS} years`);
    sections.push(`- **Available coupons:** ${coupons.length}`);
    sections.push("");
    sections.push("### Features included");
    sections.push("");
    for (const feature of option.highlights) {
      sections.push(`- ${feature}`);
    }
    if (planId === "DEALIFY_STARTER") {
      sections.push("- Rivals analysis: not included");
    }
    sections.push("");
    sections.push("### Coupon codes");
    sections.push("");
    if (coupons.length === 0) {
      sections.push("_No unused coupons._");
    } else {
      for (const { code } of coupons) {
        sections.push(`- \`${code}\``);
      }
    }
    sections.push("");
  }

  const outPath = path.resolve(process.cwd(), "coupons.md");
  writeFileSync(outPath, sections.join("\n"), "utf8");
  console.log(`Wrote ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

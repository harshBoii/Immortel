import Prisma from "@prisma/client";
const { PrismaClient } = Prisma;
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./dev.db";

const adapter = url.startsWith("postgres")
  ? new PrismaPg({ connectionString: url })
  : new PrismaBetterSqlite3({ url });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

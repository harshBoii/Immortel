import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Company } from "@prisma/client";

type Hint = {
  email?: string;
  companyName?: string;
  userName?: string;
};

/**
 * Resolves a company by verifying the account password, optionally narrowed by
 * email, slug/name, or userName (same rules as /api/mcp/company-data).
 */
export async function resolveCompanyByPassword(
  password: string,
  hint?: Hint,
): Promise<Company | null> {
  if (hint?.email) {
    const c = await prisma.company.findUnique({
      where: { email: hint.email.trim().toLowerCase() },
    });
    if (c?.password && (await bcrypt.compare(password, c.password))) return c;
    return null;
  }

  if (hint?.userName) {
    const c = await prisma.company.findUnique({
      where: { userName: hint.userName.trim() },
    });
    if (c?.password && (await bcrypt.compare(password, c.password))) return c;
    return null;
  }

  if (hint?.companyName) {
    const name = hint.companyName.trim();
    const candidates = await prisma.company.findMany({
      where: {
        password: { not: null },
        OR: [
          { slug: name.toLowerCase() },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
      take: 20,
    });
    for (const c of candidates) {
      if (c.password && (await bcrypt.compare(password, c.password))) return c;
    }
    return null;
  }

  const candidates = await prisma.company.findMany({
    where: { password: { not: null }, isExternal: false },
    select: { id: true, password: true },
  });
  for (const c of candidates) {
    if (c.password && (await bcrypt.compare(password, c.password))) {
      return prisma.company.findUnique({ where: { id: c.id } });
    }
  }
  return null;
}

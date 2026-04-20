import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loadSerializedDataMineForCompany } from "@/lib/geo/dataMinePayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  password?: unknown;
  email?: unknown;
  companyName?: unknown;
  userName?: unknown;
};

async function resolveCompanyByPassword(password: string, hint?: {
  email?: string;
  companyName?: string;
  userName?: string;
}) {
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

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json(
      { success: false, error: "`password` is required" },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email : undefined;
  const companyName = typeof body.companyName === "string" ? body.companyName : undefined;
  const userName = typeof body.userName === "string" ? body.userName : undefined;

  const company = await resolveCompanyByPassword(password, { email, companyName, userName });
  if (!company) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const payload = await loadSerializedDataMineForCompany(company.id);

  const be = payload.brandEntity;
  const identity = be
    ? {
        canonicalName: be.canonicalName ?? null,
        aliases: be.aliases ?? [],
        entityType: be.entityType ?? null,
        oneLiner: be.oneLiner ?? null,
        about: be.about ?? null,
        industry: be.industry ?? null,
        category: be.category ?? null,
        headquartersCity: be.headquartersCity ?? null,
        headquartersCountry: be.headquartersCountry ?? null,
        foundedYear: be.foundedYear ?? null,
        employeeRange: be.employeeRange ?? null,
        businessModel: be.businessModel ?? null,
        topics: be.topics ?? [],
        keywords: be.keywords ?? [],
        targetAudiences: be.targetAudiences ?? [],
      }
    : null;

  return NextResponse.json({
    success: true,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      email: company.email,
      userName: company.userName,
      website: company.website,
      domain: company.domain,
      logoUrl: company.logoUrl,
      description: company.description,
      isExternal: company.isExternal,
      isOrg: company.isOrg,
      organizationId: company.organizationId,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    },
    identity,
    dataMine: payload,
  });
}

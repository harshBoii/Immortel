import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { domainToWebsiteUrl, normalizeDomain } from "@/lib/url/normalizeDomain";
import { seedCompanyFromWebsite } from "@/lib/geo/enrichment/seedCompanyFromWebsite";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function uniqueCompanySlug(base: string) {
  const baseSlug = slugify(base) || "company";
  let slug = baseSlug;
  let suffix = 0;
  while (true) {
    const exists = await prisma.company.findUnique({ where: { slug } });
    if (!exists) return slug;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const rivals = await prisma.companyRival.findMany({
    where: { companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    include: {
      rivalCompany: {
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          website: true,
          logoUrl: true,
          description: true,
          isExternal: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    rivals: rivals.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      rivalCompanyId: r.rivalCompanyId,
      createdAt: r.createdAt.toISOString(),
      rivalCompany: {
        ...r.rivalCompany,
        createdAt: r.rivalCompany.createdAt.toISOString(),
        updatedAt: r.rivalCompany.updatedAt.toISOString(),
      },
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  let domainInput: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    domainInput = body?.domain ?? body?.url ?? body?.website ?? undefined;
  } catch {
    // ignore
  }

  if (!domainInput || typeof domainInput !== "string") {
    return NextResponse.json(
      { success: false, error: "domain is required" },
      { status: 400 }
    );
  }

  let domain: string;
  try {
    domain = normalizeDomain(domainInput);
  } catch (e) {
    return NextResponse.json(
      { success: false, error: (e as Error).message || "Invalid domain" },
      { status: 400 }
    );
  }

  const companyId = session.companyId;
  const owner = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, domain: true, website: true },
  });
  if (!owner) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  // Prevent self-rival by domain (best-effort).
  if (owner.domain && owner.domain.toLowerCase() === domain.toLowerCase()) {
    return NextResponse.json(
      { success: false, error: "You cannot add your own company as a rival." },
      { status: 400 }
    );
  }

  const websiteUrl = domainToWebsiteUrl(domain);

  // Upsert target company by canonical domain (unique).
  const rivalCompany = await prisma.company.upsert({
    where: { domain },
    create: {
      name: domain,
      slug: await uniqueCompanySlug(domain),
      domain,
      website: websiteUrl,
      isExternal: true,
    },
    update: {
      website: websiteUrl,
      isExternal: true,
    },
    select: { id: true, domain: true, website: true },
  });

  if (rivalCompany.id === companyId) {
    return NextResponse.json(
      { success: false, error: "You cannot add your own company as a rival." },
      { status: 400 }
    );
  }

  // Idempotency: if link exists, return success.
  const existing = await prisma.companyRival.findUnique({
    where: {
      companyId_rivalCompanyId: {
        companyId,
        rivalCompanyId: rivalCompany.id,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ success: true, rivalId: existing.id, created: false });
  }

  // Enforce quota and create link atomically.
  try {
    const created = await prisma.$transaction(async (tx) => {
      const plan = await tx.companyPlan.findUnique({
        where: { companyId },
        select: { maxRivalsAllowed: true },
      });
      const max = plan?.maxRivalsAllowed ?? 10;
      const count = await tx.companyRival.count({ where: { companyId } });
      if (count >= max) {
        const err = new Error(`Rival limit reached (${max}).`);
        (err as any).code = "RIVAL_LIMIT_REACHED";
        throw err;
      }

      return await tx.companyRival.create({
        data: { companyId, rivalCompanyId: rivalCompany.id },
        select: { id: true },
      });
    });

    // Best-effort enrichment after link creation (don’t block rival creation if microservice fails).
    seedCompanyFromWebsite(prisma, {
      companyId: rivalCompany.id,
      websiteUrl,
      linkedinUrl: null,
    }).catch(() => null);

    return NextResponse.json({ success: true, rivalId: created.id, created: true });
  } catch (e) {
    const code = (e as any)?.code;
    if (code === "RIVAL_LIMIT_REACHED") {
      return NextResponse.json(
        { success: false, error: (e as Error).message },
        { status: 409 }
      );
    }
    // Unique constraint race: treat as success.
    const msg = String((e as any)?.message ?? "");
    if (msg.toLowerCase().includes("unique constraint")) {
      const again = await prisma.companyRival.findUnique({
        where: {
          companyId_rivalCompanyId: {
            companyId,
            rivalCompanyId: rivalCompany.id,
          },
        },
        select: { id: true },
      });
      if (again) return NextResponse.json({ success: true, rivalId: again.id, created: false });
    }

    return NextResponse.json(
      { success: false, error: "Failed to add rival company" },
      { status: 500 }
    );
  }
}


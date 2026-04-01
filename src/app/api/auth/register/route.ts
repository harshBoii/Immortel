import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

type CmsChoice = "Shopify" | "WordPress" | "Other";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.split("/")[0] ?? s;
  return s;
}

function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function normalizeShopDomain(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/^www\./, "");
  s = s.split("/")[0] ?? s;
  return s;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      companyName,
      companyDomain,
      websiteUrl,
      cmsChoice,
      requestedCmsName,
      shopDomain,
      wordpressSiteUrl,
    }: {
      email?: unknown;
      password?: unknown;
      companyName?: unknown;
      companyDomain?: unknown;
      websiteUrl?: unknown;
      cmsChoice?: unknown;
      requestedCmsName?: unknown;
      shopDomain?: unknown;
      wordpressSiteUrl?: unknown;
    } = body ?? {};

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (typeof companyName !== "string" || !companyName.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }
    if (typeof companyDomain !== "string" || !companyDomain.trim()) {
      return NextResponse.json(
        { error: "Company domain is required" },
        { status: 400 }
      );
    }
    if (typeof websiteUrl !== "string" || !websiteUrl.trim()) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    const cms = (typeof cmsChoice === "string" ? cmsChoice : "Other") as CmsChoice;
    if (!["Shopify", "WordPress", "Other"].includes(cms)) {
      return NextResponse.json({ error: "Invalid CMS choice" }, { status: 400 });
    }

    const emailNormalized = email.trim().toLowerCase();
    const existing = await prisma.company.findUnique({
      where: { email: emailNormalized },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This email is already registered", code: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }

    const domainNormalized = normalizeDomain(companyDomain);
    if (!domainNormalized || !domainNormalized.includes(".")) {
      return NextResponse.json(
        { error: "Company domain looks invalid" },
        { status: 400 }
      );
    }

    const websiteNormalized = normalizeUrl(websiteUrl);
    const wpSiteNormalized =
      typeof wordpressSiteUrl === "string" && wordpressSiteUrl.trim()
        ? normalizeUrl(wordpressSiteUrl)
        : null;

    const baseSlug = slugify(companyName);
    let slug = baseSlug || `company-${Date.now()}`;
    let suffix = 0;
    while (true) {
      const exists = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const requestedCmsIntegrations: string[] = [];
    if (cms === "Other") {
      if (typeof requestedCmsName !== "string" || !requestedCmsName.trim()) {
        return NextResponse.json(
          { error: "Tell us which CMS you want" },
          { status: 400 }
        );
      }
      requestedCmsIntegrations.push(requestedCmsName.trim());
    } else {
      requestedCmsIntegrations.push(cms);
    }

    const shopDomainNormalized =
      typeof shopDomain === "string" && shopDomain.trim()
        ? normalizeShopDomain(shopDomain)
        : null;

    if (cms === "Shopify" && (!shopDomainNormalized || !shopDomainNormalized.includes("."))) {
      return NextResponse.json(
        { error: "Shop domain is required for Shopify" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: {
        name: companyName.trim(),
        slug,
        domain: domainNormalized,
        website: websiteNormalized,
        email: emailNormalized,
        userName: emailNormalized,
        password: hashedPassword,
        requestedCmsIntegrations,
        wordpressRequestedSiteUrl: cms === "WordPress" ? wpSiteNormalized : null,
      },
      select: { id: true },
    });

    if (cms === "Shopify" && shopDomainNormalized) {
      await prisma.companyIntegrationCms.create({
        data: {
          companyId: company.id,
          provider: "Shopify",
          expectedShopDomain: shopDomainNormalized,
        },
      });
    }

    await prisma.geoDataSource.create({
      data: {
        companyId: company.id,
        sourceType: "URL",
        label: "Website URL",
        rawContent: websiteNormalized,
        isActive: true,
      },
    });

    await setAuthCookie(company.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}


import { setAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redeemCouponForCompany, validateCouponCode } from "@/lib/subscription/coupon";
import { createPlanCheckoutSession } from "@/lib/subscription/dodo-checkout";
import { triggerGeoAutoSeed } from "@/lib/subscription/trigger-geo-auto-seed";
import {
  getSubscriptionFieldsForPlan,
  isDealifyPlan,
  isPlanId,
  type DealifyPlanId,
} from "@/lib/subscription/plans";

type CmsChoice = "Shopify" | "WordPress" | "Other" | "None";

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
      plan: planRaw,
      couponCode: couponCodeRaw,
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
      plan?: unknown;
      couponCode?: unknown;
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
    // Signup has exactly two routes in: redeem a valid coupon, or buy a Dealify plan.
    // There is deliberately no free fallback — the free tier is reserved for legacy
    // accounts and internal teams, and is provisioned manually rather than at signup.
    const couponCode =
      typeof couponCodeRaw === "string" ? couponCodeRaw.trim() : "";
    const hasCoupon = couponCode.length > 0;

    if (hasCoupon) {
      const couponValidation = await validateCouponCode(couponCode);
      if (!couponValidation.valid) {
        return NextResponse.json(
          { error: couponValidation.error, code: couponValidation.code },
          { status: 400 }
        );
      }
    }

    let purchasePlan: DealifyPlanId | null = null;
    if (!hasCoupon) {
      if (
        typeof planRaw !== "string" ||
        !isPlanId(planRaw) ||
        !isDealifyPlan(planRaw)
      ) {
        return NextResponse.json(
          {
            error:
              "Enter a valid coupon code, or choose a plan to purchase.",
            code: "PLAN_REQUIRED",
          },
          { status: 400 }
        );
      }
      purchasePlan = planRaw;
    }

    const cms = (typeof cmsChoice === "string" ? cmsChoice : "Other") as CmsChoice;
    if (!["Shopify", "WordPress", "Other", "None"].includes(cms)) {
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
    } else if (cms !== "None") {
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

    if (hasCoupon) {
      const { company, redemption } = await prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
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
          select: { id: true, name: true, email: true },
        });

        if (cms === "Shopify" && shopDomainNormalized) {
          await tx.companyIntegrationCms.create({
            data: {
              companyId: created.id,
              provider: "Shopify",
              expectedShopDomain: shopDomainNormalized,
            },
          });
        }

        await tx.geoDataSource.create({
          data: {
            companyId: created.id,
            sourceType: "URL",
            label: "Website URL",
            rawContent: websiteNormalized,
            isActive: true,
          },
        });

        const redemptionResult = await redeemCouponForCompany({
          companyId: created.id,
          code: couponCode,
          tx,
        });

        return { company: created, redemption: redemptionResult };
      });

      await triggerGeoAutoSeed(company.id);
      await setAuthCookie(company.id);

      return NextResponse.json({
        success: true,
        couponActivated: true,
        plan: redemption.plan,
        planName: redemption.planName,
      });
    }

    // Paid signup: the subscription starts PENDING and is only activated by the
    // payment.succeeded webhook, so an abandoned checkout never yields usable quota.
    const plan = purchasePlan!;
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
        subscription: {
          create: {
            ...getSubscriptionFieldsForPlan(plan),
            status: SubscriptionStatus.PENDING,
            provider: "dodopayments",
          },
        },
      },
      select: { id: true, name: true, email: true },
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

    let checkoutUrl: string;
    try {
      checkoutUrl = await createPlanCheckoutSession({
        companyId: company.id,
        plan,
        customerEmail: emailNormalized,
        customerName: companyName.trim(),
        // /signup/success does not exist; the plan page is authenticated (the cookie is
        // set below), already shows a success banner, and reflects webhook activation.
        returnUrl: `${appUrl}/workspace/plan?checkout=success`,
      });
    } catch (err) {
      console.error("[register] plan checkout", err);
      return NextResponse.json(
        { error: "Payment configuration is incomplete. Please contact support." },
        { status: 500 }
      );
    }

    await setAuthCookie(company.id);

    return NextResponse.json({ checkoutUrl, plan });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

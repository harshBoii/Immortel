import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompany } from "@/lib/mcpCompanyResolver";

type CheckoutBody = {
  companyId?: string;
  companyName?: string;
  productIds: string[];
};

type CheckoutProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  priceMinAmount: string | null;
  priceMaxAmount: string | null;
  currencyCode: string | null;
  onlineStoreUrl: string | null;
};

type CheckoutSession = {
  sessionId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  products: CheckoutProduct[];
  createdAt: string;
  expiresAt: string;
};

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body?.companyId && !body?.companyName) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide `companyId` or `companyName` in the request body",
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "`productIds` must be a non-empty array of product IDs",
      },
      { status: 400 }
    );
  }

  const company = await resolveCompany({
    companyId: body.companyId,
    companyName: body.companyName,
  });

  if (!company) {
    return NextResponse.json(
      { success: false, error: "Company not found" },
      { status: 404 }
    );
  }

  const products: CheckoutProduct[] = await (
    prisma as any
  ).shopifyProduct.findMany({
    where: {
      id: { in: body.productIds },
      companyId: company.id,
    },
    select: {
      id: true,
      title: true,
      handle: true,
      status: true,
      priceMinAmount: true,
      priceMaxAmount: true,
      currencyCode: true,
      onlineStoreUrl: true,
    },
  });

  if (products.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No matching products found for this company",
      },
      { status: 404 }
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min

  const session: CheckoutSession = {
    sessionId: crypto.randomUUID(),
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
    products,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Encode session data into the URL — this is a stateless dummy checkout
  const encoded = Buffer.from(JSON.stringify(session)).toString("base64url");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkoutUrl = `${appUrl}/pay/${encoded}`;

  return NextResponse.json({
    success: true,
    sessionId: session.sessionId,
    checkoutUrl,
    company: { id: company.id, name: company.name },
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.priceMinAmount,
      currency: p.currencyCode,
    })),
    expiresAt: session.expiresAt,
  });
}

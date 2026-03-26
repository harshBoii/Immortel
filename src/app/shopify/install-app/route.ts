import { NextResponse, type NextRequest } from "next/server";
import { IntegrationProvider } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toAbsoluteUrl(connectUrlRaw: string, request: NextRequest): string {
  const trimmed = connectUrlRaw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const origin = new URL(request.url).origin;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

/**
 * Step 1/2: Installation entry point.
 *
 * Redirects the user to the company-specific Shopify install URL saved in
 * CompanyIntegrationCms.connectUrl.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const cms = await prisma.companyIntegrationCms.findUnique({
    where: {
      companyId_provider: {
        companyId: session.companyId,
        provider: IntegrationProvider.Shopify,
      },
    },
    select: { connectUrl: true },
  });

  const installUrl = cms?.connectUrl?.trim() ? toAbsoluteUrl(cms.connectUrl, request) : "";
  if (!installUrl) {
    return NextResponse.json(
      { success: false, error: "Missing company Shopify connectUrl (install link)" },
      { status: 400 }
    );
  }

  return NextResponse.redirect(installUrl);
}


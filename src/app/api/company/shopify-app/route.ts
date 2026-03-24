import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { IntegrationProvider } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PatchBodySchema = z.object({
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  scopes: z.string().optional(),
  appUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.companyIntegrationCms.findUnique({
    where: {
      companyId_provider: {
        companyId: session.companyId,
        provider: IntegrationProvider.Shopify,
      },
    },
    select: {
      apiKey: true,
      apiSecret: true,
      scopes: true,
      appUrl: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      apiKey: row?.apiKey ?? "",
      scopes: row?.scopes ?? "",
      appUrl: row?.appUrl ?? "",
      hasSecret: Boolean(row?.apiSecret?.trim()),
      updatedAt: row?.updatedAt ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const incoming = parsed.data;
  if (
    incoming.apiKey === undefined &&
    incoming.apiSecret === undefined &&
    incoming.scopes === undefined &&
    incoming.appUrl === undefined
  ) {
    return NextResponse.json(
      { success: false, error: "Provide at least one field to update" },
      { status: 400 }
    );
  }

  const existing = await prisma.companyIntegrationCms.findUnique({
    where: {
      companyId_provider: {
        companyId: session.companyId,
        provider: IntegrationProvider.Shopify,
      },
    },
  });

  const apiKey =
    incoming.apiKey !== undefined ? incoming.apiKey : (existing?.apiKey ?? "");
  const scopes =
    incoming.scopes !== undefined ? incoming.scopes : (existing?.scopes ?? "");
  const appUrl =
    incoming.appUrl !== undefined ? incoming.appUrl : (existing?.appUrl ?? "");
  const apiSecret =
    incoming.apiSecret !== undefined
      ? incoming.apiSecret
      : (existing?.apiSecret ?? "");

  await prisma.companyIntegrationCms.upsert({
    where: {
      companyId_provider: {
        companyId: session.companyId,
        provider: IntegrationProvider.Shopify,
      },
    },
    create: {
      companyId: session.companyId,
      provider: IntegrationProvider.Shopify,
      apiKey: apiKey || null,
      apiSecret: apiSecret || null,
      scopes: scopes || null,
      appUrl: appUrl || null,
    },
    update: {
      ...(incoming.apiKey !== undefined ? { apiKey: incoming.apiKey || null } : {}),
      ...(incoming.apiSecret !== undefined
        ? { apiSecret: incoming.apiSecret || null }
        : {}),
      ...(incoming.scopes !== undefined ? { scopes: incoming.scopes || null } : {}),
      ...(incoming.appUrl !== undefined ? { appUrl: incoming.appUrl || null } : {}),
    },
  });

  return NextResponse.json({ success: true });
}

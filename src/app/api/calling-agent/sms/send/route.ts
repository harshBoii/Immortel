import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Channel } from "@prisma/client";

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";

function trimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

async function resolvePurchaseLink(args: {
  companyId: string;
  leadId: string;
}): Promise<{ productName: string | null; productLink: string | null }> {
  const lead = await prisma.lead.findFirst({
    where: { id: args.leadId, companyId: args.companyId },
    select: { productProvider: true, productExternalId: true, productName: true },
  });
  if (!lead) return { productName: null, productLink: null };

  const provider = (lead.productProvider ?? "").toLowerCase();
  const externalId = (lead.productExternalId ?? "").trim();
  const nameQuery = (lead.productName ?? "").trim();

  if (provider === "shopify" || externalId.startsWith("gid://")) {
    if (externalId) {
      const p = await prisma.shopifyProduct.findFirst({
        where: { companyId: args.companyId, shopifyGid: externalId },
        select: { onlineStoreUrl: true, handle: true, shop: { select: { shopDomain: true } } },
      });
      const url =
        p?.onlineStoreUrl ||
        (p?.handle && p.shop?.shopDomain ? `https://${p.shop.shopDomain}/products/${p.handle}` : null);
      return { productName: lead.productName ?? null, productLink: url };
    }
    if (nameQuery) {
      const p = await prisma.shopifyProduct.findFirst({
        where: { companyId: args.companyId, title: { contains: nameQuery, mode: "insensitive" } },
        select: { onlineStoreUrl: true, handle: true, shop: { select: { shopDomain: true } } },
      });
      const url =
        p?.onlineStoreUrl ||
        (p?.handle && p.shop?.shopDomain ? `https://${p.shop.shopDomain}/products/${p.handle}` : null);
      return { productName: lead.productName ?? null, productLink: url };
    }
  }

  if (provider === "woocommerce" || /^\d+$/.test(externalId)) {
    const wcId = externalId && /^\d+$/.test(externalId) ? parseInt(externalId, 10) : null;
    if (wcId !== null) {
      const p = await prisma.wooCommerceProduct.findFirst({
        where: { companyId: args.companyId, wcProductId: wcId },
        select: { onlineStoreUrl: true, handle: true, store: { select: { storeUrl: true } } },
      });
      const url =
        p?.onlineStoreUrl ||
        (p?.handle && p.store?.storeUrl
          ? `${p.store.storeUrl.replace(/\/+$/, "")}/product/${p.handle}`
          : null);
      return { productName: lead.productName ?? null, productLink: url };
    }
    if (nameQuery) {
      const p = await prisma.wooCommerceProduct.findFirst({
        where: { companyId: args.companyId, title: { contains: nameQuery, mode: "insensitive" } },
        select: { onlineStoreUrl: true, handle: true, store: { select: { storeUrl: true } } },
      });
      const url =
        p?.onlineStoreUrl ||
        (p?.handle && p.store?.storeUrl
          ? `${p.store.storeUrl.replace(/\/+$/, "")}/product/${p.handle}`
          : null);
      return { productName: lead.productName ?? null, productLink: url };
    }
  }

  return { productName: lead.productName ?? null, productLink: null };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const to = trimmedString(body.to);
  let message = trimmedString(body.message);
  const leadIdInput = trimmedString(body.leadId);

  if (!to || !message) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: to, message" },
      { status: 400 }
    );
  }

  // Verify lead belongs to tenant (optional, but required to log conversation).
  let resolvedLeadId: string | null = null;
  if (leadIdInput) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadIdInput, companyId: session.companyId },
      select: { id: true },
    });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found or not accessible" },
        { status: 403 }
      );
    }
    resolvedLeadId = lead.id;
  } else {
    // Try to match by phone for logging.
    const match = await prisma.lead.findFirst({
      where: { companyId: session.companyId, phone: to },
      select: { id: true },
    });
    if (match) resolvedLeadId = match.id;
  }

  // Expand placeholders (optional): {productLink} / {productName}
  if (resolvedLeadId && (message.includes("{productLink}") || message.includes("{productName}"))) {
    const resolved = await resolvePurchaseLink({
      companyId: session.companyId,
      leadId: resolvedLeadId,
    });
    message = message
      .replaceAll("{productLink}", resolved.productLink ?? "")
      .replaceAll("{productName}", resolved.productName ?? "");
  }

  try {
    const upstream = await fetch(`${CALLING_AGENT_BASE}/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await upstream.json().catch(() => null);

    // Best-effort logging into Conversations (SMS channel).
    if (resolvedLeadId) {
      try {
        const convo = await prisma.conversation.upsert({
          where: {
            companyId_leadId_channel: {
              companyId: session.companyId,
              leadId: resolvedLeadId,
              channel: Channel.SMS,
            },
          },
          create: {
            companyId: session.companyId,
            leadId: resolvedLeadId,
            channel: Channel.SMS,
            summary: null,
            lastMessageAt: new Date(),
          },
          update: { lastMessageAt: new Date() },
        });

        await prisma.conversationMessage.create({
          data: {
            conversationId: convo.id,
            direction: "OUT",
            text: message,
            metadata: {
              kind: "sms",
              to,
              upstream: data,
            },
          },
        });
      } catch (err) {
        console.error("sms/send: failed to log conversation message", err);
      }
    }

    return NextResponse.json(
      {
        success: upstream.ok,
        status: upstream.status,
        data,
        leadId: resolvedLeadId,
      },
      { status: upstream.ok ? 200 : 502 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to reach calling agent service" },
      { status: 502 }
    );
  }
}


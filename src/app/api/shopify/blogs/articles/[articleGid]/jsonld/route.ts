import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopifyGraphql } from "@/lib/shopify/admin";

const NAMESPACE = "custom";
const KEY = "json_ld";

function toJsonStringAndValidate(jsonLd: unknown): { ok: true; value: string } | { ok: false; error: string } {
  let str: string;
  if (typeof jsonLd === "string") {
    str = jsonLd;
  } else {
    try {
      str = JSON.stringify(jsonLd);
    } catch {
      return { ok: false, error: "jsonLd is not JSON-serializable" };
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(str);
  } catch {
    return { ok: false, error: "jsonLd must be valid JSON" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "jsonLd must be a JSON object" };
  }
  if (typeof parsed["@context"] !== "string" || !parsed["@context"]) {
    return { ok: false, error: "jsonLd must include @context (string)" };
  }
  if (typeof parsed["@type"] !== "string" || !parsed["@type"]) {
    return { ok: false, error: "jsonLd must include @type (string)" };
  }

  return { ok: true, value: str };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ articleGid: string }> }
) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId, status: "installed" },
    select: { shopDomain: true, accessToken: true },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  const { articleGid: rawParam } = await params;
  const ownerId = decodeURIComponent(rawParam);
  if (!ownerId) {
    return NextResponse.json(
      { success: false, error: "Missing articleGid route param" },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as any;
  const jsonCheck = toJsonStringAndValidate(body?.jsonLd);
  if (!jsonCheck.ok) {
    return NextResponse.json(
      { success: false, error: jsonCheck.error },
      { status: 400 }
    );
  }

  const mutation = `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
        }
        userErrors { field message code }
      }
    }
  `;

  const res = await shopifyGraphql<{
    metafieldsSet: {
      metafields: Array<{ id: string; namespace: string; key: string }>;
      userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
    };
  }>({
    ctx: { shopDomain: shop.shopDomain, accessToken: shop.accessToken },
    query: mutation,
    variables: {
      metafields: [
        {
          ownerId,
          namespace: NAMESPACE,
          key: KEY,
          type: "json",
          value: jsonCheck.value,
        },
      ],
    },
  });

  const userErrors = res.data.metafieldsSet.userErrors ?? [];
  if (userErrors.length > 0) {
    return NextResponse.json(
      { success: false, error: "Failed to update metafield", userErrors },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { metafields: res.data.metafieldsSet.metafields } });
}


import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeShopDomain } from "@/lib/shopify/client";

const API_VERSION = "2024-10";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId, status: "installed" },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  const shopDomain = normalizeShopDomain(shop.shopDomain);
  const url = `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`;

  const query = `
    query ListProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            status
            handle
            totalInventory
            onlineStoreUrl
            createdAt
            updatedAt
          }
        }
      }
    }
  `;

  let responseJson: unknown;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shop.accessToken,
      },
      body: JSON.stringify({
        query,
        variables: { first: 50 },
      }),
    });

    responseJson = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Shopify GraphQL request failed",
          status: res.status,
          body: responseJson,
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("Error calling Shopify GraphQL products API:", err);
    return NextResponse.json(
      { success: false, error: "Failed to contact Shopify API" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    data: responseJson,
  });
}


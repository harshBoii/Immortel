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
            totalInventory
            onlineStoreUrl
            createdAt
            updatedAt
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  price
                }
              }
            }
          }
        }
      }
    }
  `;

  let responseJson: any;

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

  // Persist/update products snapshot in DB for this shop & company
  try {
    const edges: any[] = responseJson?.data?.products?.edges ?? [];

    for (const edge of edges) {
      const node = edge?.node;
      if (!node?.id) continue;

      const priceMin = node.priceRangeV2?.minVariantPrice;
      const priceMax = node.priceRangeV2?.maxVariantPrice;

      await (prisma as any).shopifyProduct.upsert({
        where: { shopifyGid: node.id as string },
        create: {
          shopifyGid: node.id as string,
          shopId: shop.id,
          companyId: shop.companyId,
          title: node.title ?? "",
          status: node.status ?? "UNKNOWN",
          handle: node.handle ?? "",
          totalInventory: node.totalInventory ?? 0,
          onlineStoreUrl: node.onlineStoreUrl ?? null,
          priceMinAmount: priceMin?.amount ?? null,
          priceMaxAmount: priceMax?.amount ?? null,
          currencyCode: priceMin?.currencyCode ?? priceMax?.currencyCode ?? null,
          shopifyCreatedAt: new Date(node.createdAt),
          shopifyUpdatedAt: new Date(node.updatedAt),
        },
        update: {
          title: node.title ?? "",
          status: node.status ?? "UNKNOWN",
          handle: node.handle ?? "",
          totalInventory: node.totalInventory ?? 0,
          onlineStoreUrl: node.onlineStoreUrl ?? null,
          priceMinAmount: priceMin?.amount ?? null,
          priceMaxAmount: priceMax?.amount ?? null,
          currencyCode: priceMin?.currencyCode ?? priceMax?.currencyCode ?? null,
          shopifyCreatedAt: new Date(node.createdAt),
          shopifyUpdatedAt: new Date(node.updatedAt),
        },
      });
    }
  } catch (err) {
    console.error("Failed to upsert Shopify products into DB:", err);
  }

  return NextResponse.json({
    success: true,
    data: responseJson,
  });
}


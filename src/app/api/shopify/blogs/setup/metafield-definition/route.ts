import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopifyGraphql } from "@/lib/shopify/admin";

const NAMESPACE = "custom";
const KEY = "json_ld";

type MetafieldDefinition = { id: string } | null;

async function fetchExistingDefinition(opts: {
  shopDomain: string;
  accessToken: string;
}): Promise<MetafieldDefinition> {
  const query = `
    query ExistingArticleJsonLdDefinition($first: Int!, $ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!) {
      metafieldDefinitions(first: $first, ownerType: $ownerType, namespace: $namespace, key: $key) {
        edges {
          node { id }
        }
      }
    }
  `;

  const res = await shopifyGraphql<{
    metafieldDefinitions: { edges: Array<{ node: { id: string } }> };
  }>({
    ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
    query,
    variables: {
      first: 1,
      ownerType: "ARTICLE",
      namespace: NAMESPACE,
      key: KEY,
    },
  });

  return res.data.metafieldDefinitions.edges[0]?.node ?? null;
}

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId, status: "installed" },
    select: {
      id: true,
      shopDomain: true,
      accessToken: true,
      articleJsonLdMetafieldDefinitionGid: true,
    },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  if (shop.articleJsonLdMetafieldDefinitionGid) {
    return NextResponse.json({
      success: true,
      data: { definitionId: shop.articleJsonLdMetafieldDefinitionGid, existing: true },
    });
  }

  const mutation = `
    mutation CreateArticleJsonLdDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }
  `;

  let createdId: string | null = null;
  let userErrors: Array<{ field: string[] | null; message: string; code: string | null }> =
    [];

  try {
    const res = await shopifyGraphql<{
      metafieldDefinitionCreate: {
        createdDefinition: { id: string } | null;
        userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
      };
    }>({
      ctx: { shopDomain: shop.shopDomain, accessToken: shop.accessToken },
      query: mutation,
      variables: {
        definition: {
          name: "JSON-LD",
          namespace: NAMESPACE,
          key: KEY,
          type: "json",
          ownerType: "ARTICLE",
        },
      },
    });

    createdId = res.data.metafieldDefinitionCreate.createdDefinition?.id ?? null;
    userErrors = res.data.metafieldDefinitionCreate.userErrors ?? [];
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create metafield definition",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }

  const existing = createdId ? null : await fetchExistingDefinition(shop);
  const definitionId = createdId ?? existing?.id ?? null;

  if (!definitionId) {
    return NextResponse.json(
      {
        success: false,
        error: "Metafield definition not created",
        userErrors,
      },
      { status: 400 }
    );
  }

  await prisma.shopifyShop.update({
    where: { id: shop.id },
    data: { articleJsonLdMetafieldDefinitionGid: definitionId },
  });

  return NextResponse.json({
    success: userErrors.length === 0,
    data: { definitionId, created: Boolean(createdId) },
    userErrors,
  });
}


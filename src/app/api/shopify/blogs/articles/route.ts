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

async function ensureArticleJsonLdDefinition(opts: {
  shopId: string;
  shopDomain: string;
  accessToken: string;
}): Promise<string> {
  const shopRow = await prisma.shopifyShop.findUnique({
    where: { id: opts.shopId },
    select: { articleJsonLdMetafieldDefinitionGid: true },
  });
  if (shopRow?.articleJsonLdMetafieldDefinitionGid) return shopRow.articleJsonLdMetafieldDefinitionGid;

  const mutation = `
    mutation CreateArticleJsonLdDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }
  `;

  const res = await shopifyGraphql<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string } | null;
      userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
    };
  }>({
    ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
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

  const createdId = res.data.metafieldDefinitionCreate.createdDefinition?.id ?? null;
  if (!createdId) {
    const query = `
      query ExistingArticleJsonLdDefinition($first: Int!, $ownerType: MetafieldOwnerType!, $namespace: String!, $key: String!) {
        metafieldDefinitions(first: $first, ownerType: $ownerType, namespace: $namespace, key: $key) {
          edges { node { id } }
        }
      }
    `;
    const existing = await shopifyGraphql<{
      metafieldDefinitions: { edges: Array<{ node: { id: string } }> };
    }>({
      ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
      query,
      variables: { first: 1, ownerType: "ARTICLE", namespace: NAMESPACE, key: KEY },
    });
    const found = existing.data.metafieldDefinitions.edges[0]?.node?.id;
    if (!found) throw new Error("Unable to ensure metafield definition exists");

    await prisma.shopifyShop.update({
      where: { id: opts.shopId },
      data: { articleJsonLdMetafieldDefinitionGid: found },
    });
    return found;
  }

  await prisma.shopifyShop.update({
    where: { id: opts.shopId },
    data: { articleJsonLdMetafieldDefinitionGid: createdId },
  });

  return createdId;
}

async function maybeRollbackArticle(opts: {
  shopDomain: string;
  accessToken: string;
  articleId: string;
}): Promise<void> {
  const mutation = `
    mutation ArticleDelete($id: ID!) {
      articleDelete(id: $id) {
        deletedArticleId
        userErrors { field message code }
      }
    }
  `;

  await shopifyGraphql({
    ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
    query: mutation,
    variables: { id: opts.articleId },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId: session.companyId, status: "installed" },
    select: { id: true, shopDomain: true, accessToken: true },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => null)) as any;
  const channelHandle =
    typeof body?.channelHandle === "string" ? body.channelHandle.trim().toLowerCase() : null;
  const blogGid = typeof body?.blogGid === "string" ? body.blogGid.trim() : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const bodyHtml = typeof body?.bodyHtml === "string" ? body.bodyHtml : "";
  const publishedAt =
    typeof body?.publishedAt === "string" && body.publishedAt ? body.publishedAt : null;
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean)
    : [];
  const rollbackOnError = Boolean(body?.rollbackOnError);

  if (!title || !bodyHtml) {
    return NextResponse.json(
      { success: false, error: "Missing required fields (title, bodyHtml)" },
      { status: 400 }
    );
  }

  const jsonCheck = toJsonStringAndValidate(body?.jsonLd);
  if (!jsonCheck.ok) {
    return NextResponse.json(
      { success: false, error: jsonCheck.error },
      { status: 400 }
    );
  }

  let resolvedBlogId: string | null = blogGid;
  if (!resolvedBlogId && channelHandle) {
    const channel = await prisma.shopifyBlogChannel.findUnique({
      where: { shopId_handle: { shopId: shop.id, handle: channelHandle } },
      select: { shopifyBlogGid: true },
    });
    resolvedBlogId = channel?.shopifyBlogGid ?? null;
  }

  if (!resolvedBlogId) {
    return NextResponse.json(
      { success: false, error: "Missing blogGid (or unknown channelHandle)" },
      { status: 400 }
    );
  }

  try {
    await ensureArticleJsonLdDefinition({
      shopId: shop.id,
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to ensure metafield definition exists",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }

  const mutation = `
    mutation ArticleCreate($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { id handle title }
        userErrors { field message code }
      }
    }
  `;

  const res = await shopifyGraphql<{
    articleCreate: {
      article: { id: string; handle: string; title: string } | null;
      userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
    };
  }>({
    ctx: { shopDomain: shop.shopDomain, accessToken: shop.accessToken },
    query: mutation,
    variables: {
      article: {
        blogId: resolvedBlogId,
        title,
        bodyHtml,
        ...(publishedAt ? { publishedAt } : {}),
        ...(tags.length ? { tags } : {}),
        metafields: [
          {
            namespace: NAMESPACE,
            key: KEY,
            type: "json",
            value: jsonCheck.value,
          },
        ],
      },
    },
  });

  const article = res.data.articleCreate.article;
  const userErrors = res.data.articleCreate.userErrors ?? [];

  if (userErrors.length > 0 && article?.id && rollbackOnError) {
    try {
      await maybeRollbackArticle({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        articleId: article.id,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Article creation had userErrors; rolled back",
          data: { articleId: article.id },
          userErrors,
        },
        { status: 400 }
      );
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Article created with userErrors and rollback failed",
          data: { articleId: article.id },
          userErrors,
          rollbackError: e instanceof Error ? e.message : String(e),
        },
        { status: 207 }
      );
    }
  }

  if (userErrors.length > 0 && article?.id) {
    return NextResponse.json(
      {
        success: false,
        error: "Article created with userErrors (partial success)",
        data: { articleId: article.id },
        userErrors,
      },
      { status: 207 }
    );
  }

  if (userErrors.length > 0) {
    return NextResponse.json(
      { success: false, error: "Article not created", userErrors },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { article } });
}


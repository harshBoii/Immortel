import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ShopifyAdminError, shopifyGraphql } from "@/lib/shopify/admin";
import { syncBountyRevenueForCompany } from "@/lib/geo/radar/bountySync";

const BLOG_CHANNEL_HANDLE = "quick-reads";

const JSON_LD_NAMESPACE = "custom";
const JSON_LD_KEY = "json_ld";

const PAYLOAD_NAMESPACE = "custom";
const PAYLOAD_KEY = "immortel_payload";

// ─── Types ────────────────────────────────────────────────────────────────────

type GqlUserError = { field: string[] | null; message: string; code: string | null };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonStringifyAndValidate(
  value: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  let str: string;
  try {
    str = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return { ok: false, error: "Value is not JSON-serializable" };
  }
  try {
    JSON.parse(str);
  } catch {
    return { ok: false, error: "Value must be valid JSON" };
  }
  return { ok: true, value: str };
}

function minimalMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      const level = Math.min(6, heading[1].length);
      htmlLines.push(`<h${level}>${applyInline(heading[2].trim())}</h${level}>`);
      continue;
    }

    // Unordered list items
    const listItem = /^[-*]\s+(.*)$/.exec(line);
    if (listItem) {
      if (!inList) { htmlLines.push("<ul>"); inList = true; }
      htmlLines.push(`<li>${applyInline(listItem[1])}</li>`);
      continue;
    }

    // Close list on blank line
    if (!line.trim()) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      continue;
    }

    // Regular paragraph
    if (inList) { htmlLines.push("</ul>"); inList = false; }
    htmlLines.push(`<p>${applyInline(line)}</p>`);
  }

  if (inList) htmlLines.push("</ul>");
  return htmlLines.join("\n");
}

// Handles inline: **bold**, *italic*, `code`
function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ─── Metafield Definition ─────────────────────────────────────────────────────

async function ensureMetafieldDefinition(opts: {
  shopDomain: string;
  accessToken: string;
  namespace: string;
  key: string;
  name: string;
}): Promise<void> {
  const mutation = `
    mutation EnsureMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }
  `;

  const res = await shopifyGraphql<{
    metafieldDefinitionCreate: {
      createdDefinition: { id: string } | null;
      userErrors: GqlUserError[];
    } | null;
  }>({
    ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
    query: mutation,
    variables: {
      definition: {
        name: opts.name,
        namespace: opts.namespace,
        key: opts.key,
        type: "json",
        ownerType: "ARTICLE",
      },
    },
  });

  const userErrors = res.data?.metafieldDefinitionCreate?.userErrors ?? [];
  const isAlreadyExists = userErrors.some(
    (e) =>
      e.code === "TAKEN" ||
      e.message?.toLowerCase().includes("already") ||
      e.message?.toLowerCase().includes("taken")
  );

  if (userErrors.length > 0 && !isAlreadyExists) {
    throw new Error(`metafieldDefinitionCreate failed: ${JSON.stringify(userErrors)}`);
  }
}

// ─── Blog Channel ─────────────────────────────────────────────────────────────

async function ensureBlogChannel(opts: {
  shopId: string;
  companyId: string;
  shopDomain: string;
  accessToken: string;
  handle: string;
}): Promise<{ blogId: string; existing: boolean }> {
  const existing = await prisma.shopifyBlogChannel.findUnique({
    where: { shopId_handle: { shopId: opts.shopId, handle: opts.handle } },
    select: { shopifyBlogGid: true },
  });
  if (existing) return { blogId: existing.shopifyBlogGid, existing: true };

  const mutation = `
    mutation BlogCreate($blog: BlogCreateInput!) {
      blogCreate(blog: $blog) {
        blog { id title handle }
        userErrors { field message code }
      }
    }
  `;

  const title = opts.handle === "vlogs" ? "Vlogs" : opts.handle;

  const res = await shopifyGraphql<{
    blogCreate: {
      blog: { id: string; title: string; handle: string } | null;
      userErrors: GqlUserError[];
    } | null;
  }>({
    ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
    query: mutation,
    variables: { blog: { title, handle: opts.handle } },
  });

  const blogCreate = res.data?.blogCreate;
  const userErrors = blogCreate?.userErrors ?? [];

  if (userErrors.length > 0) {
    throw new Error(`blogCreate userErrors: ${JSON.stringify(userErrors)}`);
  }

  const blogId = blogCreate?.blog?.id ?? null;
  if (!blogId) {
    throw new Error(
      `blogCreate returned null blog with no userErrors. ` +
        `Check that write_content scope is granted for shop ${opts.shopDomain}.`
    );
  }

  await prisma.shopifyBlogChannel.create({
    data: {
      shopId: opts.shopId,
      companyId: opts.companyId,
      handle: opts.handle,
      title,
      shopifyBlogGid: blogId,
    },
  });

  return { blogId, existing: false };
}

function storefrontBlogArticleUrl(opts: {
  shopDomain: string;
  blogHandle: string;
  articleHandle: string;
}): string {
  const host = opts.shopDomain.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const blog = opts.blogHandle.trim();
  const handle = opts.articleHandle.trim();
  return `https://${host}/blogs/${blog}/${handle}`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: bountyId } = await context.params;
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const bounty = await prisma.citationBounty.findFirst({
    where: { id: bountyId, companyId },
    select: {
      id: true,
      query: true,
      pageType: true,
      generationContext: true,
      aeoPage: {
        select: {
          id: true,
          slug: true,
          locale: true,
          title: true,
          seoTitle: true,
          description: true,
          publishedAt: true,
          summary: true,
          facts: true,
          claims: true,
          faq: true,
          knowledgeGraph: true,
        },
      },
    },
  });

  if (!bounty || !bounty.aeoPage) {
    return NextResponse.json(
      { success: false, error: "Bounty or generated page not found" },
      { status: 404 }
    );
  }

  const shop = await prisma.shopifyShop.findFirst({
    where: { companyId, status: "installed" },
    select: { id: true, shopDomain: true, accessToken: true },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  // Ensure metafield definitions exist (best-effort, idempotent).
  try {
    await ensureMetafieldDefinition({
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      namespace: JSON_LD_NAMESPACE,
      key: JSON_LD_KEY,
      name: "JSON-LD",
    });
    await ensureMetafieldDefinition({
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      namespace: PAYLOAD_NAMESPACE,
      key: PAYLOAD_KEY,
      name: "Immortel Payload",
    });
  } catch (e) {
    const details =
      e instanceof ShopifyAdminError
        ? { message: e.message, status: e.status, body: e.body }
        : { message: e instanceof Error ? e.message : String(e) };
    console.error("[geo/approve-shopify] ensureMetafieldDefinition failed", details);
    return NextResponse.json(
      { success: false, error: "Failed to ensure metafield definitions", details },
      { status: 502 }
    );
  }

  let blogId: string;
  try {
    const ensured = await ensureBlogChannel({
      shopId: shop.id,
      companyId,
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      handle: BLOG_CHANNEL_HANDLE,
    });
    blogId = ensured.blogId;
  } catch (e) {
    const details =
      e instanceof ShopifyAdminError
        ? { message: e.message, status: e.status, body: e.body }
        : { message: e instanceof Error ? e.message : String(e) };
    console.error("[geo/approve-shopify] ensureBlogChannel failed", details);
    return NextResponse.json(
      { success: false, error: "Failed to ensure blog channel exists", details },
      { status: 502 }
    );
  }

  const aeoPage = bounty.aeoPage;
  const title = (aeoPage.seoTitle ?? aeoPage.title ?? bounty.query).trim();
  const body = minimalMarkdownToHtml(aeoPage.description ?? "");
  const publishDate = aeoPage.publishedAt ? aeoPage.publishedAt.toISOString() : null;

  const jsonLdCandidate = aeoPage.knowledgeGraph ?? {};
  const jsonLdStr = jsonStringifyAndValidate(jsonLdCandidate);
  if (!jsonLdStr.ok) {
    return NextResponse.json(
      { success: false, error: `Invalid JSON-LD payload: ${jsonLdStr.error}` },
      { status: 400 }
    );
  }

  const immortelPayload = {
    bountyId: bounty.id,
    query: bounty.query,
    pageType: bounty.pageType,
    aeoPage: {
      id: aeoPage.id,
      slug: aeoPage.slug,
      locale: aeoPage.locale,
      title: aeoPage.title,
      seoTitle: aeoPage.seoTitle,
      publishedAt: publishDate,
      summary: aeoPage.summary,
      facts: aeoPage.facts,
      claims: aeoPage.claims,
      faq: aeoPage.faq,
      jsonLd: jsonLdCandidate,
    },
    generationContext: bounty.generationContext,
  };

  const payloadStr = jsonStringifyAndValidate(immortelPayload);
  if (!payloadStr.ok) {
    return NextResponse.json(
      { success: false, error: `Invalid metadata payload: ${payloadStr.error}` },
      { status: 400 }
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
      userErrors: GqlUserError[];
    };
  }>({
    ctx: { shopDomain: shop.shopDomain, accessToken: shop.accessToken },
    query: mutation,
    variables: {
      article: {
        blogId,
        title,
        body,
        author: { name: "Immortel" },                          // FIX: required field, was missing
        ...(publishDate ? { publishDate } : {}),               // FIX: was `publishedAt`, correct key is `publishDate`
        tags: ["geo", "bounty", BLOG_CHANNEL_HANDLE],
        metafields: [
          {
            namespace: JSON_LD_NAMESPACE,
            key: JSON_LD_KEY,
            type: "json",
            value: jsonLdStr.value,
          },
          {
            namespace: PAYLOAD_NAMESPACE,
            key: PAYLOAD_KEY,
            type: "json",
            value: payloadStr.value,
          },
        ],
      },
    },
  });

  const article = res.data.articleCreate.article;
  const userErrors = res.data.articleCreate.userErrors ?? [];

  if (userErrors.length > 0 && article?.id) {
    const publishedCanonical =
      article.handle &&
      storefrontBlogArticleUrl({
        shopDomain: shop.shopDomain,
        blogHandle: BLOG_CHANNEL_HANDLE,
        articleHandle: article.handle,
      });
    if (publishedCanonical) {
      await prisma.aeoPage.update({
        where: { id: aeoPage.id },
        data: { canonicalUrl: publishedCanonical },
      });
    }
    console.warn("[geo/approve-shopify] articleCreate partial success", {
      bountyId,
      articleId: article.id,
      userErrors,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Article created with userErrors (partial success)",
        data: {
          articleId: article.id,
          blogId,
          channelHandle: BLOG_CHANNEL_HANDLE,
          canonicalUrl: publishedCanonical ?? undefined,
        },
        userErrors,
      },
      { status: 207 }
    );
  }

  if (userErrors.length > 0) {
    return NextResponse.json(
      { success: false, error: "Failed to create article", userErrors },
      { status: 400 }
    );
  }

  const publishedCanonical =
    article?.handle &&
    storefrontBlogArticleUrl({
      shopDomain: shop.shopDomain,
      blogHandle: BLOG_CHANNEL_HANDLE,
      articleHandle: article.handle,
    });
  if (publishedCanonical) {
    await prisma.aeoPage.update({
      where: { id: aeoPage.id },
      data: { canonicalUrl: publishedCanonical },
    });
  }

  await prisma.citationBounty.update({
    where: { id: bountyId },
    data: { publishedAt: new Date() },
  });
  await syncBountyRevenueForCompany(prisma, companyId);

  return NextResponse.json({
    success: true,
    data: {
      article,
      blogId,
      channelHandle: BLOG_CHANNEL_HANDLE,
      canonicalUrl: publishedCanonical ?? undefined,
    },
  });
}

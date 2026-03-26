import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shopifyGraphql } from "@/lib/shopify/admin";

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

async function fetchBlogIdByHandle(opts: {
  shopDomain: string;
  accessToken: string;
  handle: string;
}): Promise<string | null> {
  const query = `
    query BlogByHandle($first: Int!, $query: String!) {
      blogs(first: $first, query: $query) {
        edges {
          node { id handle title }
        }
      }
    }
  `;

  const res = await shopifyGraphql<{
    blogs: { edges: Array<{ node: { id: string; handle: string; title: string } }> };
  }>({
    ctx: { shopDomain: opts.shopDomain, accessToken: opts.accessToken },
    query,
    variables: { first: 5, query: `handle:${opts.handle}` },
  });

  const match = res.data.blogs.edges.find((e) => e.node.handle === opts.handle);
  return match?.node.id ?? null;
}

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
    select: { id: true },
  });

  if (!shop) {
    return NextResponse.json(
      { success: false, error: "No connected Shopify store found" },
      { status: 404 }
    );
  }

  const channels = await prisma.shopifyBlogChannel.findMany({
    where: { shopId: shop.id, companyId: session.companyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, handle: true, title: true, shopifyBlogGid: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: { channels } });
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

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; handle?: unknown }
    | null;

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const handleRaw = typeof body?.handle === "string" ? body.handle : "";
  const handle = normalizeHandle(handleRaw);

  if (!title || !handle) {
    return NextResponse.json(
      { success: false, error: "Missing required fields (title, handle)" },
      { status: 400 }
    );
  }

  const existing = await prisma.shopifyBlogChannel.findUnique({
    where: { shopId_handle: { shopId: shop.id, handle } },
    select: { id: true, handle: true, title: true, shopifyBlogGid: true },
  });

  if (existing) {
    return NextResponse.json({ success: true, data: { channel: existing, existing: true } });
  }

  const mutation = `
    mutation BlogCreate($blog: BlogCreateInput!) {
      blogCreate(blog: $blog) {
        blog { id title handle }
        userErrors { field message code }
      }
    }
  `;

  const res = await shopifyGraphql<{
    blogCreate: {
      blog: { id: string; title: string; handle: string } | null;
      userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
    };
  }>({
    ctx: { shopDomain: shop.shopDomain, accessToken: shop.accessToken },
    query: mutation,
    variables: { blog: { title, handle } },
  });

  const userErrors = res.data.blogCreate.userErrors ?? [];

  let blogId = res.data.blogCreate.blog?.id ?? null;
  if (!blogId) {
    blogId = await fetchBlogIdByHandle({
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      handle,
    });
  }

  if (!blogId) {
    return NextResponse.json(
      { success: false, error: "Failed to create blog", userErrors },
      { status: 400 }
    );
  }

  const channel = await prisma.shopifyBlogChannel.create({
    data: {
      shopId: shop.id,
      companyId: session.companyId,
      handle,
      title,
      shopifyBlogGid: blogId,
    },
    select: { id: true, handle: true, title: true, shopifyBlogGid: true },
  });

  return NextResponse.json({
    success: userErrors.length === 0,
    data: { channel, existing: false },
    userErrors,
  });
}


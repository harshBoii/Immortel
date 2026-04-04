import type { WooCommerceProduct, WooCommerceStore } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  bulkIndexWooCommerceProducts,
  deleteProductIdsFromElasticsearch,
} from "@/lib/productsIndex";
import { getWooCommerceRestApiForCompany } from "./client";
import type WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

type WcRestProduct = {
  id: number;
  name?: string;
  slug?: string;
  permalink?: string;
  status?: string;
  price?: string;
  regular_price?: string;
  stock_quantity?: number | null;
  stock_status?: string;
  manage_stock?: boolean;
  date_created_gmt?: string;
  date_modified_gmt?: string;
  images?: { src?: string; alt?: string; width?: number; height?: number }[];
  description?: string;
};

function normalizeWcStatus(raw: string): string {
  const u = raw.toLowerCase();
  if (u === "publish") return "ACTIVE";
  if (u === "draft" || u === "pending") return "DRAFT";
  return "ARCHIVED";
}

function parseWcDate(s: string | undefined): Date {
  if (!s) return new Date();
  const d = new Date(s.includes("T") ? s : `${s} GMT`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function pickPrice(raw: WcRestProduct): { min: string | null; max: string | null } {
  const p = (raw.price ?? "").trim();
  const reg = (raw.regular_price ?? "").trim();
  const use = p || reg;
  if (!use) return { min: null, max: null };
  return { min: use, max: use };
}

function pickInventory(raw: WcRestProduct): number {
  if (raw.manage_stock && raw.stock_quantity != null && Number.isFinite(raw.stock_quantity)) {
    return Math.max(0, raw.stock_quantity);
  }
  if (raw.stock_status === "instock") return 1;
  return 0;
}

function mapRow(
  raw: WcRestProduct,
  store: WooCommerceStore,
  currencyCode: string | null
): Omit<WooCommerceProduct, "id" | "createdAt" | "updatedAt"> {
  const img = raw.images?.[0];
  const price = pickPrice(raw);
  const statusRaw = raw.status ?? "draft";

  return {
    wooCommerceStoreId: store.id,
    companyId: store.companyId,
    wcProductId: raw.id,
    title: (raw.name ?? "").slice(0, 500) || "Untitled",
    status: normalizeWcStatus(statusRaw),
    wcStatusRaw: statusRaw.slice(0, 50),
    handle: (raw.slug ?? `product-${raw.id}`).slice(0, 255),
    totalInventory: pickInventory(raw),
    onlineStoreUrl: raw.permalink?.slice(0, 1000) ?? null,
    priceMinAmount: price.min,
    priceMaxAmount: price.max,
    currencyCode: currencyCode?.slice(0, 10) ?? null,
    wcCreatedAt: parseWcDate(raw.date_created_gmt),
    wcUpdatedAt: parseWcDate(raw.date_modified_gmt),
    featuredImageAltText: img?.alt?.slice(0, 500) ?? null,
    featuredImageHeight: img?.height ?? null,
    featuredImageUrl: img?.src?.slice(0, 2000) ?? null,
    featuredImageWidth: img?.width ?? null,
    description: raw.description ?? null,
  };
}

async function fetchStoreCurrency(client: WooCommerceRestApi): Promise<string | null> {
  try {
    const res = await client.get("system_status");
    const data = res?.data as {
      settings?: { currency?: string; general?: { currency?: string } };
    } | null;
    const cur =
      data?.settings?.currency ??
      data?.settings?.general?.currency;
    return typeof cur === "string" && cur.trim() ? cur.trim() : null;
  } catch {
    return null;
  }
}

async function fetchAllProducts(client: WooCommerceRestApi): Promise<WcRestProduct[]> {
  const out: WcRestProduct[] = [];
  let page = 1;

  for (;;) {
    const res = await client.get("products", {
      per_page: 100,
      page,
      status: "any",
    });

    const rows = res?.data as WcRestProduct[] | undefined;
    if (!Array.isArray(rows) || rows.length === 0) break;

    out.push(...rows);

    const headers = res.headers as Record<string, string | undefined>;
    const totalPages = parseInt(
      headers["x-wp-totalpages"] ?? headers["X-WP-TotalPages"] ?? "1",
      10
    );
    if (!Number.isFinite(totalPages) || page >= totalPages) break;
    page += 1;
  }

  return out;
}

export type SyncWooCommerceProductsResult = {
  upserted: number;
  removed: number;
  indexed: number;
};

export async function syncWooCommerceProductsForCompany(
  companyId: string
): Promise<SyncWooCommerceProductsResult> {
  const resolved = await getWooCommerceRestApiForCompany(companyId);
  if (!resolved.ok) {
    throw new Error(
      resolved.error === "NO_STORE"
        ? "No connected WooCommerce store"
        : "Could not decrypt API credentials"
    );
  }

  const { client, store } = resolved;

  const currencyCode = await fetchStoreCurrency(client);
  const rawProducts = await fetchAllProducts(client);
  const ids = rawProducts.map((r) => r.id);

  const staleRows = await prisma.wooCommerceProduct.findMany({
    where:
      ids.length > 0
        ? {
            wooCommerceStoreId: store.id,
            wcProductId: { notIn: ids },
          }
        : { wooCommerceStoreId: store.id },
    select: { id: true },
  });
  const staleIds = staleRows.map((r) => r.id);

  const saved: WooCommerceProduct[] = [];
  let removed = 0;

  await prisma.$transaction(async (tx) => {
    if (ids.length > 0) {
      const del = await tx.wooCommerceProduct.deleteMany({
        where: {
          wooCommerceStoreId: store.id,
          wcProductId: { notIn: ids },
        },
      });
      removed = del.count;
    } else {
      const del = await tx.wooCommerceProduct.deleteMany({
        where: { wooCommerceStoreId: store.id },
      });
      removed = del.count;
    }

    for (const raw of rawProducts) {
      const data = mapRow(raw, store, currencyCode);
      const row = await tx.wooCommerceProduct.upsert({
        where: {
          wooCommerceStoreId_wcProductId: {
            wooCommerceStoreId: store.id,
            wcProductId: raw.id,
          },
        },
        create: data,
        update: {
          ...data,
        },
      });
      saved.push(row);
    }
  });

  await deleteProductIdsFromElasticsearch(staleIds);
  await bulkIndexWooCommerceProducts(saved);

  return {
    upserted: saved.length,
    removed,
    indexed: saved.length,
  };
}

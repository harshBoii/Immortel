import type { ShopifyProduct, WooCommerceProduct } from "@prisma/client";
import { getElasticsearchClient, PRODUCTS_INDEX } from "./elasticsearch";

export async function ensureProductsIndex() {
  const client = getElasticsearchClient();

  const exists = await client.indices.exists({ index: PRODUCTS_INDEX });
  if (exists) return;

  await client.indices.create({
    index: PRODUCTS_INDEX,
    mappings: {
      properties: {
        id: { type: "keyword" },
        companyId: { type: "keyword" },
        shopId: { type: "keyword" },
        shopifyGid: { type: "keyword" },
        title: { type: "text", fields: { keyword: { type: "keyword" } } },
        handle: { type: "text", fields: { keyword: { type: "keyword" } } },
        status: { type: "keyword" },
        totalInventory: { type: "integer" },
        priceMinAmountNumber: { type: "double" },
        priceMaxAmountNumber: { type: "double" },
        currencyCode: { type: "keyword" },
        shopifyCreatedAt: { type: "date" },
        shopifyUpdatedAt: { type: "date" },
        featuredImageUrl: { type: "keyword" },
        featuredImageAltText: { type: "text" },
        featuredImageWidth: { type: "integer" },
        featuredImageHeight: { type: "integer" },
      },
    },
  });
}

export function serializeProductForIndex(product: ShopifyProduct) {
  const priceMinAmountNumber = product.priceMinAmount
    ? Number(product.priceMinAmount)
    : null;
  const priceMaxAmountNumber = product.priceMaxAmount
    ? Number(product.priceMaxAmount)
    : null;

  return {
    id: product.id,
    companyId: product.companyId,
    shopId: product.shopId,
    shopifyGid: product.shopifyGid,
    title: product.title,
    handle: product.handle,
    status: product.status,
    totalInventory: product.totalInventory,
    priceMinAmount: product.priceMinAmount,
    priceMaxAmount: product.priceMaxAmount,
    priceMinAmountNumber,
    priceMaxAmountNumber,
    currencyCode: product.currencyCode,
    shopifyCreatedAt: product.shopifyCreatedAt,
    shopifyUpdatedAt: product.shopifyUpdatedAt,
    featuredImageUrl: product.featuredImageUrl,
    featuredImageAltText: product.featuredImageAltText,
    featuredImageWidth: product.featuredImageWidth,
    featuredImageHeight: product.featuredImageHeight,
  };
}

export async function indexProduct(product: ShopifyProduct) {
  const client = getElasticsearchClient();
  await ensureProductsIndex();

  await client.index({
    index: PRODUCTS_INDEX,
    id: product.id,
    document: serializeProductForIndex(product),
    refresh: "false",
  });
}

export async function bulkIndexProducts(products: ShopifyProduct[]) {
  if (products.length === 0) return;

  const client = getElasticsearchClient();
  await ensureProductsIndex();

  const operations: any[] = [];

  for (const product of products) {
    operations.push({
      index: {
        _index: PRODUCTS_INDEX,
        _id: product.id,
      },
    });
    operations.push(serializeProductForIndex(product));
  }

  await client.bulk({
    operations,
    refresh: "false",
  });
}

/** Same Elasticsearch mapping as Shopify products so MCP `search_products` stays unified. */
export function serializeWooCommerceProductForIndex(product: WooCommerceProduct) {
  const priceMinAmountNumber = product.priceMinAmount
    ? Number(product.priceMinAmount)
    : null;
  const priceMaxAmountNumber = product.priceMaxAmount
    ? Number(product.priceMaxAmount)
    : null;

  return {
    id: product.id,
    companyId: product.companyId,
    shopId: product.wooCommerceStoreId,
    shopifyGid: `wc:product:${product.wcProductId}:${product.wooCommerceStoreId}`,
    title: product.title,
    handle: product.handle,
    status: product.status,
    totalInventory: product.totalInventory,
    priceMinAmount: product.priceMinAmount,
    priceMaxAmount: product.priceMaxAmount,
    priceMinAmountNumber,
    priceMaxAmountNumber,
    currencyCode: product.currencyCode,
    shopifyCreatedAt: product.wcCreatedAt,
    shopifyUpdatedAt: product.wcUpdatedAt,
    featuredImageUrl: product.featuredImageUrl,
    featuredImageAltText: product.featuredImageAltText,
    featuredImageWidth: product.featuredImageWidth,
    featuredImageHeight: product.featuredImageHeight,
  };
}

export async function bulkIndexWooCommerceProducts(products: WooCommerceProduct[]) {
  if (products.length === 0) return;

  const client = getElasticsearchClient();
  await ensureProductsIndex();

  const operations: any[] = [];

  for (const product of products) {
    operations.push({
      index: {
        _index: PRODUCTS_INDEX,
        _id: product.id,
      },
    });
    operations.push(serializeWooCommerceProductForIndex(product));
  }

  await client.bulk({
    operations,
    refresh: "false",
  });
}

/** Removes product docs from the shared products index (Shopify + WooCommerce use Prisma `id` as ES `_id`). */
export async function deleteProductIdsFromElasticsearch(ids: string[]) {
  if (ids.length === 0) return;

  const client = getElasticsearchClient();
  await ensureProductsIndex();

  const operations: any[] = [];
  for (const id of ids) {
    operations.push({
      delete: {
        _index: PRODUCTS_INDEX,
        _id: id,
      },
    });
  }

  await client.bulk({
    operations,
    refresh: "false",
  });
}


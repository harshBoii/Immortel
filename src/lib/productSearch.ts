import type { ShopifyProduct } from "@prisma/client";
import { getElasticsearchClient, PRODUCTS_INDEX } from "./elasticsearch";

type ParsedQuery = {
  textTerms: string[];
  priceMin?: number;
  priceMax?: number;
};

export function parseProductSearchQuery(raw: string): ParsedQuery {
  const q = raw.toLowerCase().trim();

  const result: ParsedQuery = {
    textTerms: [],
  };

  // Price: between X and Y
  const betweenMatch = q.match(/between\s+(\d+)\s+(?:and|to)\s+(\d+)/);
  if (betweenMatch) {
    result.priceMin = Number(betweenMatch[1]);
    result.priceMax = Number(betweenMatch[2]);
  } else {
    // under / below X
    const underMatch = q.match(/(?:under|below)\s+(\d+)/);
    if (underMatch) {
      result.priceMax = Number(underMatch[1]);
    }

    // over / above X
    const overMatch = q.match(/(?:over|above)\s+(\d+)/);
    if (overMatch) {
      result.priceMin = Number(overMatch[1]);
    }
  }

  // Remove price phrases from the text terms
  let textPortion = q
    .replace(/between\s+\d+\s+(?:and|to)\s+\d+/, " ")
    .replace(/(?:under|below)\s+\d+/, " ")
    .replace(/(?:over|above)\s+\d+/, " ");

  textPortion = textPortion.replace(/\s+/g, " ").trim();

  if (textPortion.length > 0) {
    result.textTerms = textPortion.split(" ");
  }

  return result;
}

export async function searchProductsInElasticsearch(params: {
  companyId: string;
  query: string;
  page?: number;
  pageSize?: number;
  status?: string[];
  priceMinOverride?: number;
  priceMaxOverride?: number;
  inventoryMin?: number;
  inventoryMax?: number;
}): Promise<{ hits: ShopifyProduct[]; total: number }> {
  const {
    companyId,
    query,
    page = 1,
    pageSize = 20,
    status,
    priceMinOverride,
    priceMaxOverride,
    inventoryMin,
    inventoryMax,
  } = params;

  const parsed = parseProductSearchQuery(query);

  const priceMin = priceMinOverride ?? parsed.priceMin;
  const priceMax = priceMaxOverride ?? parsed.priceMax;

  const from = (page - 1) * pageSize;
  const size = pageSize;

  const must: any[] = [];
  const filter: any[] = [
    {
      term: {
        companyId,
      },
    },
  ];

  if (parsed.textTerms.length > 0) {
    must.push({
      multi_match: {
        query: parsed.textTerms.join(" "),
        fields: ["title^3", "handle^2"],
        type: "best_fields",
      },
    });
  }

  if (status && status.length > 0) {
    filter.push({
      terms: {
        status,
      },
    });
  }

  if (priceMin != null || priceMax != null) {
    const range: Record<string, number> = {};
    if (priceMin != null) range.gte = priceMin;
    if (priceMax != null) range.lte = priceMax;

    filter.push({
      range: {
        priceMinAmountNumber: range,
      },
    });
  }

  if (inventoryMin != null || inventoryMax != null) {
    const range: Record<string, number> = {};
    if (inventoryMin != null) range.gte = inventoryMin;
    if (inventoryMax != null) range.lte = inventoryMax;

    filter.push({
      range: {
        totalInventory: range,
      },
    });
  }

  const client = getElasticsearchClient();

  const response = await client.search<ShopifyProduct>({
    index: PRODUCTS_INDEX,
    from,
    size,
    query: {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    },
    sort: [
      {
        shopifyUpdatedAt: {
          order: "desc",
        },
      },
    ],
  });

  const hits = response.hits.hits.map((hit) => {
    return {
      ...(hit._source as ShopifyProduct),
    };
  });

  const total =
    typeof response.hits.total === "number"
      ? response.hits.total
      : response.hits.total?.value ?? 0;

  return { hits, total };
}


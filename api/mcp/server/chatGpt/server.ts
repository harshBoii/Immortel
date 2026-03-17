import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { z } from "zod";

const PORT = process.env.MCP_PORT ? Number(process.env.MCP_PORT) : 3001;
const IMMORTEL_BASE_URL =
  process.env.IMMORTEL_API_BASE_URL ?? "https://immortel.vercel.app";

const WIDGET_DOMAIN = "https://immortel.vercel.app";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Immortel MCP App Server",
    version: "1.0.0",
  });

  const productListResourceUri = "ui://product-list/mcp-app.html";
  const checkoutResourceUri = "ui://checkout/mcp-app.html";

  // ─── list_products ──────────────────────────────────────────────────────

  const listProductsInputSchema = z.object({
    companyName: z.string().optional().describe("Company name or slug"),
    page: z.number().int().optional().default(1).describe("Page number"),
    pageSize: z.number().int().optional().default(20).describe("Items per page"),
  });
  type ListProductsInput = z.infer<typeof listProductsInputSchema>;

  registerAppTool(
    server,
    "list_products",
    {
      title: "List products",
      description: "List products from the Immortel catalog.",
      inputSchema: listProductsInputSchema as any,
      _meta: {
        ui: { resourceUri: productListResourceUri },
        "openai/outputTemplate": productListResourceUri,
      },
    },
    (async (input) => {
      const { page = 1, pageSize = 20, companyName } = input as ListProductsInput;
      const url = new URL("/api/mcp/products", IMMORTEL_BASE_URL);
      if (companyName) url.searchParams.set("companyName", companyName);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));

      console.log("[list_products] →", url.toString());

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("[list_products] ✗ HTTP", res.status);
        return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
      }

      const data = await res.json();

      // ── Image debug ──────────────────────────────────────────────────────
      const products = data.data ?? [];
      console.log(`[list_products] ✓ ${products.length} products returned`);
      products.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`  [${i}] "${p.title}" → featuredImage:`, p.featuredImage ?? "NULL");
      });
      // ────────────────────────────────────────────────────────────────────

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
        structuredContent: data,
      };
    }) as any
  );

  // ─── get_product ────────────────────────────────────────────────────────

  const getProductInputSchema = z.object({
    id: z.string().describe("Product ID"),
    companyName: z.string().optional().describe("Company name or slug"),
  });
  type GetProductInput = z.infer<typeof getProductInputSchema>;

  registerAppTool(
    server,
    "get_product",
    {
      title: "Get product",
      description: "Get detailed product info by ID.",
      inputSchema: getProductInputSchema as any,
      _meta: {
        ui: { resourceUri: productListResourceUri },
        "openai/outputTemplate": productListResourceUri,
      },
    },
    (async (input) => {
      const { id, companyName } = input as GetProductInput;
      const url = new URL(`/api/mcp/products/${encodeURIComponent(id)}`, IMMORTEL_BASE_URL);
      if (companyName) url.searchParams.set("companyName", companyName);

      console.log("[get_product] →", url.toString());

      const res = await fetch(url.toString());
      if (!res.ok) {
        console.error("[get_product] ✗ HTTP", res.status);
        return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
      }

      const data = await res.json();

      console.log(`[get_product] ✓ "${data.data?.title}" → featuredImage:`, data.data?.featuredImage ?? "NULL");

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data)  }],
        structuredContent: data,
      };
    }) as any
  );

  // ─── search_products ────────────────────────────────────────────────────

  const searchProductsInputSchema = z.object({
    query: z.string().describe("Search query for products"),
    companyName: z.string().optional().describe("Company name or slug"),
    priceMin: z.number().optional().describe("Minimum price filter"),
    priceMax: z.number().optional().describe("Maximum price filter"),
  });
  type SearchProductsInput = z.infer<typeof searchProductsInputSchema>;

  registerAppTool(
    server,
    "search_products",
    {
      title: "Search products",
      description: "Search products by query.",
      inputSchema: searchProductsInputSchema as any,
      _meta: {
        ui: { resourceUri: productListResourceUri },
        "openai/outputTemplate": productListResourceUri,
      },
    },
    (async (input) => {
      const { query, companyName, priceMin, priceMax } = input as SearchProductsInput;
      const url = new URL("/api/mcp/products/search", IMMORTEL_BASE_URL);
      const body: Record<string, unknown> = { query };
      if (companyName) body.companyName = companyName;
      if (typeof priceMin === "number") body.priceMin = priceMin;
      if (typeof priceMax === "number") body.priceMax = priceMax;

      console.log("[search_products] →", url.toString(), "body:", JSON.stringify(body));

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("[search_products] ✗ HTTP", res.status);
        return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
      }

      const data = await res.json();

      // ── Image debug ──────────────────────────────────────────────────────
      const products = data.data ?? [];
      console.log(`[search_products] ✓ ${products.length} results`);
      products.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`  [${i}] "${p.title}" → featuredImage:`, p.featuredImage ?? "NULL");
      });
      // ────────────────────────────────────────────────────────────────────

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data)  }],
        structuredContent: data,
      };
    }) as any
  );

  // ─── create_checkout ────────────────────────────────────────────────────

  const createCheckoutInputSchema = z.object({
    companyName: z.string().optional().describe("Company name or slug"),
    productIds: z.array(z.string()).min(1).describe("Product IDs to checkout"),
  });
  type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;

  registerAppTool(
    server,
    "create_checkout",
    {
      title: "Create checkout",
      description: "Create a checkout session for selected products.",
      inputSchema: createCheckoutInputSchema as any,
      _meta: {
        ui: { resourceUri: checkoutResourceUri },
        "openai/outputTemplate": checkoutResourceUri,
      },
    },
    (async (input) => {
      const { companyName, productIds } = input as CreateCheckoutInput;
      const url = new URL("/api/mcp/products/checkout", IMMORTEL_BASE_URL);
      const body: Record<string, unknown> = { productIds };
      if (companyName) body.companyName = companyName;

      console.log("[create_checkout] →", url.toString(), "productIds:", productIds);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error("[create_checkout] ✗ HTTP", res.status);
        return { content: [{ type: "text" as const, text: `Error: ${res.status}` }] };
      }

      const data = await res.json();
      console.log("[create_checkout] ✓ checkoutUrl:", data.checkoutUrl ?? "MISSING");

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data)  }],
        structuredContent: data,
      };
    }) as any
  );

  // ─── UI Resources ────────────────────────────────────────────────────────

  registerAppResource(
    server,
    "Immortel Product List",
    productListResourceUri,
    { description: "Product listing widget for Immortel catalog" },
    async () => ({
      contents: [{
        uri: productListResourceUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="openai-widget" content="true" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Immortel Products</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${process.env.WIDGET_PRODUCT_LIST_URL ?? `${WIDGET_DOMAIN}/widget/product-list.js`}"></script>
  </body>
</html>`,
        _meta: {
          ui: {
            csp: {
              resourceDomains: [WIDGET_DOMAIN],
              connectDomains: [WIDGET_DOMAIN],
            },
          },
        },
      }],
    })
  );

  registerAppResource(
    server,
    "Immortel Checkout",
    checkoutResourceUri,
    { description: "Checkout widget for Immortel products" },
    async () => ({
      contents: [{
        uri: checkoutResourceUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="openai-widget" content="true" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Immortel Checkout</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${process.env.WIDGET_CHECKOUT_URL ?? `${WIDGET_DOMAIN}/widget/checkout.js`}"></script>
  </body>
</html>`,
        _meta: {
          ui: {
            csp: {
              resourceDomains: [WIDGET_DOMAIN],
              connectDomains: [WIDGET_DOMAIN],
            },
          },
        },
      }],
    })
  );

  return server;
}

// ─── HTTP entrypoint ─────────────────────────────────────────────────────────

const app = createMcpExpressApp({ host: "0.0.0.0" });

app.all("/mcp", async (req: Request, res: Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, (req as any).body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

const httpServer = app.listen(PORT, (err?: Error) => {
  if (err) { console.error("Failed to start:", err); process.exit(1); }
  console.log(`MCP server listening on http://localhost:${PORT}/mcp`);
});

process.on("SIGINT", () => { httpServer.close(() => process.exit(0)); });
process.on("SIGTERM", () => { httpServer.close(() => process.exit(0)); });

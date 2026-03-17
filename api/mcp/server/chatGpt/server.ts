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

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Immortel MCP App Server",
    version: "1.0.0",
  });

  const productListResourceUri = "ui://product-list/mcp-app.html";
  const checkoutResourceUri = "ui://checkout/mcp-app.html";

  // ─── list_products ────────────────────────────────────────────────────────

  const listProductsInputSchema = z.object({
    companyName: z.string().optional().describe("Company name or slug"),
    page: z.number().int().optional().default(1).describe("Page number"),
    pageSize: z
      .number()
      .int()
      .optional()
      .default(20)
      .describe("Number of products per page"),
  });

  type ListProductsInput = z.infer<typeof listProductsInputSchema>;

  registerAppTool(
    server,
    "list_products",
    {
      title: "List products",
      description: "List products from the Immortel catalog.",
      inputSchema: listProductsInputSchema as any,
      _meta: { ui: { resourceUri: productListResourceUri } },
    },
    (async (input) => {
      const { page = 1, pageSize = 20, companyName } =
        input as ListProductsInput;
      const url = new URL("/api/mcp/products", IMMORTEL_BASE_URL);
      if (companyName) url.searchParams.set("companyName", companyName);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const msg = `Failed to list products: ${res.status} ${res.statusText}`;
        return { content: [{ type: "text" as const, text: msg }] };
      }

      const data = await res.json();

      // ✅ FIX 1 — structuredContent added so widget receives the data
      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${data.pagination?.total ?? 0} products from ${data.company?.name ?? companyName}.`,
          },
        ],
        structuredContent: data,
      };
    }) as any
  );

  // ─── get_product ──────────────────────────────────────────────────────────

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
      _meta: { ui: { resourceUri: productListResourceUri } },
    },
    (async (input) => {
      const { id, companyName } = input as GetProductInput;
      const path = `/api/mcp/products/${encodeURIComponent(id)}`;
      const url = new URL(path, IMMORTEL_BASE_URL);
      if (companyName) url.searchParams.set("companyName", companyName);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const msg = `Failed to get product: ${res.status} ${res.statusText}`;
        return { content: [{ type: "text" as const, text: msg }] };
      }

      const data = await res.json();

      // ✅ FIX 1 — structuredContent added
      return {
        content: [
          {
            type: "text" as const,
            text: `Loaded product: ${data.data?.title ?? id}`,
          },
        ],
        structuredContent: data,
      };
    }) as any
  );

  // ─── search_products ──────────────────────────────────────────────────────

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
      _meta: { ui: { resourceUri: productListResourceUri } },
    },
    (async (input) => {
      const { query, companyName, priceMin, priceMax } =
        input as SearchProductsInput;
      const url = new URL("/api/mcp/products/search", IMMORTEL_BASE_URL);

      const body: Record<string, unknown> = { query };
      if (companyName) body.companyName = companyName;
      if (typeof priceMin === "number") body.priceMin = priceMin;
      if (typeof priceMax === "number") body.priceMax = priceMax;

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = `Failed to search products: ${res.status} ${res.statusText}`;
        return { content: [{ type: "text" as const, text: msg }] };
      }

      const data = await res.json();

      // ✅ FIX 1 — structuredContent added
      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${data.pagination?.total ?? 0} results for "${query}".`,
          },
        ],
        structuredContent: data,
      };
    }) as any
  );

  // ─── create_checkout ──────────────────────────────────────────────────────

  const createCheckoutInputSchema = z.object({
    companyName: z.string().optional().describe("Company name or slug"),
    productIds: z
      .array(z.string())
      .min(1)
      .describe("List of product IDs to include in checkout"),
  });

  type CreateCheckoutInput = z.infer<typeof createCheckoutInputSchema>;

  registerAppTool(
    server,
    "create_checkout",
    {
      title: "Create checkout",
      description: "Create a checkout session for selected products.",
      inputSchema: createCheckoutInputSchema as any,
      _meta: { ui: { resourceUri: checkoutResourceUri } },
    },
    (async (input) => {
      const { companyName, productIds } = input as CreateCheckoutInput;
      const url = new URL("/api/mcp/products/checkout", IMMORTEL_BASE_URL);

      const body: Record<string, unknown> = { productIds };
      if (companyName) body.companyName = companyName;

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = `Failed to create checkout: ${res.status} ${res.statusText}`;
        return { content: [{ type: "text" as const, text: msg }] };
      }

      const data = await res.json();

      // ✅ FIX 1 — structuredContent added
      return {
        content: [
          {
            type: "text" as const,
            text: `Checkout ready. Redirecting to payment portal.`,
          },
        ],
        structuredContent: data,
      };
    }) as any
  );

  // ─── UI Resources ─────────────────────────────────────────────────────────

  registerAppResource(
    server,
    productListResourceUri,
    productListResourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      // ✅ FIX 2 — added <meta name="openai-widget" content="true" />
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="openai-widget" content="true" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Immortel Products</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${
      process.env.WIDGET_PRODUCT_LIST_URL ??
      "https://immortel.vercel.app/widget/product-list.js"
    }"></script>
  </body>
</html>`;

      return {
        contents: [
          {
            uri: productListResourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    }
  );

  registerAppResource(
    server,
    checkoutResourceUri,
    checkoutResourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      // ✅ FIX 2 — added <meta name="openai-widget" content="true" />
      const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="openai-widget" content="true" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Immortel Checkout</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${
      process.env.WIDGET_CHECKOUT_URL ??
      "https://immortel.vercel.app/widget/checkout.js"
    }"></script>
  </body>
</html>`;

      return {
        contents: [
          {
            uri: checkoutResourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    }
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
  if (err) {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  }
  console.log(`MCP server listening on http://localhost:${PORT}/mcp`);
});

const shutdown = () => {
  console.log("\nShutting down MCP server...");
  httpServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

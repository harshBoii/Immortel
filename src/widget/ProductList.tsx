import { useEffect, useState } from "react";

type Product = {
  id: string;
  title: string;
  featuredImage?: { url: string; altText?: string | null };
  priceMinAmount?: string | null;
  currencyCode?: string | null;
  totalInventory?: number | null;
  handle?: string | null;
};

type ProductListPayload = {
  data: Product[];
  company?: { slug?: string | null; name?: string | null };
  pagination?: { total: number };
};

export default function ProductList() {
  const [data, setData] = useState<ProductListPayload | null>(
    // ✅ Read initial value directly from window.openai.toolOutput
    () => (window as any).openai?.toolOutput ?? null
  );

  useEffect(() => {
    // ✅ ChatGPT fires this custom DOM event (NOT postMessage) when data updates
    const onSetGlobals = (event: Event) => {
      const customEvent = event as CustomEvent;
      const toolOutput =
        customEvent.detail?.globals?.toolOutput ??
        (window as any).openai?.toolOutput;
      if (toolOutput) setData(toolOutput);
    };

    window.addEventListener("openai:set_globals", onSetGlobals, { passive: true });
    return () => window.removeEventListener("openai:set_globals", onSetGlobals);
  }, []);

  if (!data) {
    return (
      <div style={{ padding: 16, color: "#666", fontFamily: "sans-serif" }}>
        Loading products…
      </div>
    );
  }

  const products = Array.isArray(data.data) ? data.data : [];
  const companySlug = data.company?.slug ?? undefined;

  return (
    <div style={{ padding: 12, fontFamily: "sans-serif" }}>
      {data.company?.name && (
        <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>
          {data.company.name} — {data.pagination?.total ?? products.length} products
        </h2>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {product.featuredImage?.url && (
              <img
                src={product.featuredImage.url}
                alt={product.featuredImage.altText ?? product.title}
                style={{ width: "100%", borderRadius: 8, objectFit: "cover", aspectRatio: "1/1" }}
              />
            )}
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {product.title || "Untitled product"}
            </h3>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
              {product.priceMinAmount
                ? `$${product.priceMinAmount} ${product.currencyCode ?? ""}`
                : "Price unavailable"}
            </p>
            {typeof product.totalInventory === "number" && (
              <p style={{ margin: 0, color: "#888", fontSize: 12 }}>
                📦 {product.totalInventory} in stock
              </p>
            )}
            <button
              onClick={() =>
                // ✅ Use window.openai.callTool for ChatGPT
                (window as any).openai?.callTool?.("create_checkout", {
                  companyName: companySlug,
                  productIds: [product.id],
                })
              }
              style={{
                background: "#000", color: "#fff", border: "none",
                borderRadius: 8, padding: "8px 12px", cursor: "pointer",
                fontSize: 13, fontWeight: 600, width: "100%", marginTop: "auto",
              }}
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

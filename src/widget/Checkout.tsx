import { useEffect, useState } from "react";

type CheckoutPayload = {
  success?: boolean;
  sessionId?: string;
  checkoutUrl?: string | null;
  expiresAt?: string | null;
  company?: { id?: string; name?: string } | null;
  products?: Array<{ id: string; title: string; price: string; currency: string }> | null;
};

export default function Checkout() {
  const [data, setData] = useState<CheckoutPayload | null>(
    // ✅ Read initial value from window.openai.toolOutput
    () => (window as any).openai?.toolOutput ?? null
  );

  useEffect(() => {
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
        Waiting for checkout data…
      </div>
    );
  }

  const checkoutUrl = data.checkoutUrl ?? null;
  const products = data.products ?? [];
  const companyName = data.company?.name ?? null;

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, fontFamily: "sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
        🛒 Checkout {companyName ? `— ${companyName}` : ""}
      </h3>
      {products.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {products.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span>{p.title}</span>
              <span style={{ fontWeight: 600 }}>{p.currency} {p.price}</span>
            </div>
          ))}
        </div>
      )}
      {data.expiresAt && (
        <p style={{ margin: 0, fontSize: 12, color: "#999" }}>
          ⏳ Expires: {new Date(data.expiresAt).toLocaleString()}
        </p>
      )}
      {checkoutUrl ? (
        <button
          onClick={() => (window as any).openai?.openExternal?.({ url: checkoutUrl }) ?? window.open(checkoutUrl, "_blank")}
          style={{ background: "#000", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: 600, width: "100%" }}
        >
          Complete Purchase →
        </button>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#999" }}>No checkout URL available.</p>
      )}
    </div>
  );
}

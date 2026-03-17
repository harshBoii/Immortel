import { useEffect, useState } from "react";

type CheckoutPayload = {
  success?: boolean;
  sessionId?: string;
  checkoutUrl?: string | null;
  expiresAt?: string | null;
  company?: { id?: string; name?: string } | null;
  products?: Array<{
    id: string;
    title: string;
    price: string;
    currency: string;
  }> | null;
};

type MessagePayload = {
  jsonrpc: "2.0";
  method: string;
  params?: {
    structuredContent?: CheckoutPayload;
  };
};

export default function Checkout() {
  const [data, setData] = useState<CheckoutPayload | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<MessagePayload>) => {
      console.log("[Checkout] message received:", event.data); // debug
      const msg = event.data;
      if (!msg || msg.jsonrpc !== "2.0") return;
      if (msg.method !== "ui/notifications/tool-result") return;
      const payload = msg.params?.structuredContent;
      if (payload) setData(payload);
    };

    // ✅ Listener attached FIRST
    window.addEventListener("message", onMessage);

    // ✅ Ready signal sent AFTER listener is ready
    window.parent.postMessage(
      { jsonrpc: "2.0", method: "ui/notifications/ready", params: {} },
      "*"
    );

    return () => window.removeEventListener("message", onMessage);
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
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
        fontFamily: "sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
        🛒 Checkout {companyName ? `— ${companyName}` : ""}
      </h3>

      {products.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {products.map((p) => (
            <div
              key={p.id}
              style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}
            >
              <span>{p.title}</span>
              <span style={{ fontWeight: 600 }}>
                {p.currency} {p.price}
              </span>
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
          onClick={() => window.open(checkoutUrl, "_blank")}
          style={{
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
          }}
        >
          Complete Purchase →
        </button>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#999" }}>
          No checkout URL available.
        </p>
      )}
    </div>
  );
}

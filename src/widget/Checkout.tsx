import { useEffect, useState } from "react";
import type { App } from "@modelcontextprotocol/ext-apps";

// ── Types ────────────────────────────────────────────────────────────────────

type CheckoutProduct = {
  id: string;
  title: string;
  price: string;
  currency: string;
};

type CheckoutPayload = {
  success?: boolean;
  sessionId?: string;
  checkoutUrl?: string | null;
  expiresAt?: string | null;
  company?: { id?: string; name?: string } | null;
  products?: CheckoutProduct[] | null;
};

// ── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600&family=Share+Tech+Mono&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --black:          #080808;
    --black-2:        #111111;
    --black-3:        #1a1a1a;
    --black-4:        #222222;
    --green:          #00FF88;
    --green-dim:      #00CC6A;
    --green-dark:     #008F4A;
    --green-glow:     rgba(0, 255, 136, 0.18);
    --green-glow-lg:  rgba(0, 255, 136, 0.32);
    --white:          #F0F0F0;
    --grey:           #888888;
    --grey-dim:       #555555;
    --red:            #FF6060;
    --red-dim:        rgba(255, 96, 96, 0.12);
    --border:         rgba(0, 255, 136, 0.14);
    --border-bright:  rgba(0, 255, 136, 0.35);
    --radius:         10px;
    --radius-sm:      6px;
    --font-mono:      'Share Tech Mono', 'Courier New', monospace;
    --font-body:      'Outfit', system-ui, sans-serif;
    --font-label:     'DM Sans', system-ui, sans-serif;
  }

  html, body {
    background: var(--black);
    color: var(--white);
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  #root { padding: 14px; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--black-3); }
  ::-webkit-scrollbar-thumb { background: var(--green-dark); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--green); box-shadow: 0 0 6px var(--green); }

  /* ── Wrapper card ── */
  .checkout-card {
    position: relative;
    overflow: hidden;
    background: var(--black-2);
    border: 1px solid var(--border);
    border-top-color: rgba(0, 255, 136, 0.22);
    border-radius: var(--radius);
    box-shadow: 0 0 0 1px rgba(0,255,136,0.08), 3px 3px 0 0 rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
  }

  /* Neon corner orbs */
  .checkout-card::before, .checkout-card::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(48px);
    opacity: 0.5;
  }
  .checkout-card::before {
    width: 160px; height: 160px;
    top: -60px; left: -40px;
    background: radial-gradient(circle, rgba(0,255,136,0.20) 0%, transparent 70%);
  }
  .checkout-card::after {
    width: 120px; height: 120px;
    bottom: -40px; right: -30px;
    background: radial-gradient(circle, rgba(0,255,136,0.12) 0%, transparent 70%);
  }
  .checkout-card > * { position: relative; z-index: 1; }

  /* ── Header ── */
  .checkout-header {
    padding: 16px 16px 12px;
    border-bottom: 1px solid rgba(0,255,136,0.08);
  }
  .checkout-company {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--green-dim);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 6px;
    opacity: 0.8;
  }
  .checkout-company::before { content: "// "; opacity: 0.5; }
  .checkout-title {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 400;
    color: var(--green);
    letter-spacing: 0.03em;
    text-shadow: 0 0 14px rgba(0,255,136,0.45);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* ── Product rows ── */
  .product-list {
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
  }
  .product-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 0;
    border-bottom: 1px solid rgba(0,255,136,0.06);
    gap: 12px;
  }
  .product-row:last-child { border-bottom: none; }

  /* scan-line accent on left */
  .product-row::before {
    content: "▸";
    color: var(--green-dark);
    font-size: 10px;
    flex-shrink: 0;
    opacity: 0.6;
  }
  .product-name {
    font-family: var(--font-label);
    font-size: 13px;
    font-weight: 500;
    color: var(--white);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .product-price {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--green-dim);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  /* ── Divider ── */
  .section-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(0,255,136,0.18), transparent);
    margin: 0 16px;
  }

  /* ── Total row ── */
  .total-row {
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,255,136,0.04);
    border-top: 1px solid rgba(0,255,136,0.12);
    border-bottom: 1px solid rgba(0,255,136,0.08);
  }
  .total-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--grey);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .total-amount {
    font-family: var(--font-mono);
    font-size: 22px;
    color: var(--green);
    letter-spacing: 0.02em;
    text-shadow: 0 0 16px rgba(0,255,136,0.5);
  }

  /* ── Footer ── */
  .checkout-footer {
    padding: 12px 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .expires-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--grey);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 3px;
    padding: 3px 10px;
    width: fit-content;
    letter-spacing: 0.04em;
  }
  .expires-badge .dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--red);
    box-shadow: 0 0 6px var(--red);
    animation: blink 1.4s ease-in-out infinite;
    flex-shrink: 0;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }

  /* ── CTA Button ── */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 11px 18px;
    background: transparent;
    color: var(--green);
    border: 1px solid var(--green-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: background 0.18s ease, box-shadow 0.18s ease,
                border-color 0.18s ease, transform 0.14s ease, color 0.18s ease;
  }
  .btn-primary:hover {
    background: var(--green-glow);
    border-color: var(--green);
    color: #ffffff;
    box-shadow: 0 0 14px var(--green-glow-lg), inset 0 0 10px var(--green-glow);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(1px); }
  .btn-primary:disabled {
    opacity: 0.35;
    pointer-events: none;
    color: var(--grey-dim);
    border-color: var(--grey-dim);
  }

  /* ── No URL ── */
  .no-url {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--grey);
    text-align: center;
    padding: 4px 0;
    opacity: 0.6;
  }

  /* ── Waiting state ── */
  .state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
    font-family: var(--font-mono);
  }
  .state-icon { font-size: 30px; opacity: 0.4; }
  .state-text { font-size: 13px; color: var(--green-dim); }
  .state-sub  { font-size: 11px; color: var(--grey); }
`;

// ── Component ─────────────────────────────────────────────────────────────────

// export default function Checkout() {
//   const [data, setData] = useState<CheckoutPayload | null>(
//     () =>
//       (window as any).openai?.toolOutput ??
//       (window as any).claude?.toolOutput ??
//       null
//   );
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     const onSetGlobals = (event: Event) => {
//       const e = event as CustomEvent;
//       const toolOutput =
//         e.detail?.globals?.toolOutput ??
//         (window as any).openai?.toolOutput ??
//         (window as any).claude?.toolOutput;
//       if (toolOutput) setData(toolOutput);
//     };
//     window.addEventListener("openai:set_globals", onSetGlobals, { passive: true });
//     window.addEventListener("claude:set_globals", onSetGlobals, { passive: true });
//     return () => {
//       window.removeEventListener("openai:set_globals", onSetGlobals);
//       window.removeEventListener("claude:set_globals", onSetGlobals);
//     };
//   }, []);

//   const handleCheckout = async () => {
//     if (!data?.checkoutUrl) return;
//     setLoading(true);
//     try {
//       const openExternal =
//         (window as any).openai?.openExternal ??
//         (window as any).claude?.openExternal;
//       if (openExternal) {
//         await openExternal({ url: data.checkoutUrl });
//       } else {
//         window.open(data.checkoutUrl, "_blank");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

export default function Checkout({
  app,
  onReady,
}: {
  app: App;
  onReady: (setter: (data: any) => void) => void;
}) {
  const [data, setData] = useState<CheckoutPayload | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Replace old window.openai/claude listeners
  useEffect(() => {
    onReady((incoming) => setData(incoming));
  }, [onReady]);

  const handleCheckout = async () => {
    if (!data?.checkoutUrl) return;
    setLoading(true);
    try {
      // ✅ Use app.callServerTool, fallback to window.open
      await app.callServerTool({
        name: "open_url",
        arguments: { url: data.checkoutUrl },
      }).catch(() => {
        window.open(data.checkoutUrl!, "_blank");
      });
    } finally {
      setLoading(false);
    }
  };


  const products = data?.products ?? [];
  const checkoutUrl = data?.checkoutUrl ?? null;
  const companyName = data?.company?.name ?? null;
  const total = products.reduce((sum, p) => sum + parseFloat(p.price || "0"), 0);
  const currency = products[0]?.currency ?? "USD";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {!data ? (
        <div className="state-box">
          <div className="state-icon">🛒</div>
          <div className="state-text">// preparing checkout...</div>
          <div className="state-sub">this will only take a moment</div>
        </div>
      ) : (
        <div className="checkout-card">

          {/* Header */}
          <div className="checkout-header">
            {companyName && (
              <p className="checkout-company">{companyName}</p>
            )}
            <h2 className="checkout-title">
              🛒 your_order
            </h2>
          </div>

          {/* Product list */}
          {products.length > 0 && (
            <div className="product-list">
              {products.map((p) => (
                <div key={p.id} className="product-row">
                  <span className="product-name">{p.title}</span>
                  <span className="product-price">
                    {p.currency} {parseFloat(p.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          {products.length > 0 && (
            <div className="total-row">
              <span className="total-label">total_amount</span>
              <span className="total-amount">
                {currency} {total.toFixed(2)}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="checkout-footer">
            {data.expiresAt && (
              <div className="expires-badge">
                <span className="dot" />
                expires {new Date(data.expiresAt).toLocaleString()}
              </div>
            )}

            {checkoutUrl ? (
              <button
                className="btn-primary"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? "// opening..." : "> complete_purchase()"}
              </button>
            ) : (
              <p className="no-url">// no checkout url available</p>
            )}
          </div>

        </div>
      )}
    </>
  );
}

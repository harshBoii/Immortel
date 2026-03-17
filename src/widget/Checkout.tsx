import { useEffect, useState } from "react";

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
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --parchment:      #FAF8F2;
    --parchment-2:    #F5F2EA;
    --navy:           #151D35;
    --navy-mid:       #2A3560;
    --navy-grey:      #606678;
    --orange:         #C4550A;
    --orange-hover:   #D4620F;
    --orange-dark:    #A04208;
    --border:         rgba(21, 29, 53, 0.09);
    --border-top:     rgba(255, 255, 255, 0.88);
    --shadow-card:    3px 3px 0 0 rgba(10, 13, 25, 0.20), 1.5px 1.5px 0 0 rgba(21, 29, 53, 0.06);
    --shadow-hover:   4px 5px 0 0 rgba(21, 29, 53, 0.14), 2px 2.5px 0 0 rgba(21, 29, 53, 0.07);
    --radius:         14px;
    --radius-sm:      8px;
    --font-heading:   'Playfair Display', Georgia, serif;
    --font-body:      'Outfit', system-ui, sans-serif;
    --font-label:     'DM Sans', system-ui, sans-serif;
  }

  html, body {
    background: var(--parchment);
    color: var(--navy);
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  #root { padding: 16px; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(21,29,53,0.15); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(196,85,10,0.4); }

  /* ── Wrapper card ── */
  .checkout-card {
    position: relative;
    overflow: hidden;
    background: rgba(250, 248, 242, 0.72);
    backdrop-filter: blur(18px) saturate(1.4);
    -webkit-backdrop-filter: blur(18px) saturate(1.4);
    border: 1.5px solid var(--border);
    border-top-color: var(--border-top);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Bokeh orbs */
  .checkout-card::before, .checkout-card::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(48px);
    opacity: 0.55;
  }
  .checkout-card::before {
    width: 160px; height: 160px;
    top: -50px; left: -30px;
    background: radial-gradient(circle, rgba(196,85,10,0.22) 0%, transparent 70%);
  }
  .checkout-card::after {
    width: 120px; height: 120px;
    bottom: -30px; right: -20px;
    background: radial-gradient(circle, rgba(21,29,53,0.14) 0%, transparent 70%);
  }
  .checkout-card > * { position: relative; z-index: 1; }

  /* ── Header ── */
  .checkout-header {
    padding: 18px 18px 14px;
    border-bottom: 1px solid rgba(21,29,53,0.07);
  }
  .checkout-company {
    font-family: var(--font-label);
    font-size: 11px;
    font-weight: 500;
    color: var(--orange);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
  .checkout-title {
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    letter-spacing: -0.02em;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── Product rows ── */
  .product-list {
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .product-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid rgba(21,29,53,0.05);
    gap: 12px;
  }
  .product-row:last-child { border-bottom: none; }
  .product-name {
    font-family: var(--font-label);
    font-size: 13px;
    font-weight: 500;
    color: var(--navy);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .product-price {
    font-family: var(--font-label);
    font-size: 14px;
    font-weight: 700;
    color: var(--orange-dark);
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  /* ── Total row ── */
  .total-row {
    padding: 12px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(21,29,53,0.03);
    border-top: 1.5px solid rgba(21,29,53,0.08);
    border-bottom: 1px solid rgba(21,29,53,0.06);
  }
  .total-label {
    font-family: var(--font-label);
    font-size: 12px;
    font-weight: 600;
    color: var(--navy-grey);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .total-amount {
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    letter-spacing: -0.02em;
  }

  /* ── Footer ── */
  .checkout-footer {
    padding: 14px 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .expires-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-label);
    font-size: 11px;
    font-weight: 500;
    color: var(--navy-grey);
    background: rgba(21,29,53,0.05);
    border: 1px solid rgba(21,29,53,0.08);
    border-radius: 20px;
    padding: 3px 10px;
    width: fit-content;
  }

  /* ── CTA Button ── */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 18px;
    background: var(--orange);
    color: var(--parchment);
    border: 1px solid var(--orange-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-label);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: 0 1px 5px rgba(196,85,10,0.32), inset 0 1px 0 rgba(255,255,255,0.20);
    transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.14s ease;
  }
  .btn-primary:hover {
    background: var(--orange-hover);
    box-shadow: 0 4px 16px rgba(196,85,10,0.42), inset 0 1px 0 rgba(255,255,255,0.20);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(1px); }

  /* ── No URL state ── */
  .no-url {
    font-family: var(--font-label);
    font-size: 13px;
    color: var(--navy-grey);
    text-align: center;
    padding: 4px 0;
    opacity: 0.7;
  }

  /* ── Waiting state ── */
  .state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
    color: var(--navy-grey);
    font-family: var(--font-label);
  }
  .state-icon { font-size: 32px; opacity: 0.5; }
  .state-text { font-size: 14px; font-weight: 500; }
  .state-sub  { font-size: 12px; opacity: 0.7; }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Checkout() {
  const [data, setData] = useState<CheckoutPayload | null>(
    () => (window as any).openai?.toolOutput ?? null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onSetGlobals = (event: Event) => {
      const e = event as CustomEvent;
      const toolOutput =
        e.detail?.globals?.toolOutput ?? (window as any).openai?.toolOutput;
      if (toolOutput) setData(toolOutput);
    };
    window.addEventListener("openai:set_globals", onSetGlobals, { passive: true });
    return () => window.removeEventListener("openai:set_globals", onSetGlobals);
  }, []);

  const handleCheckout = async () => {
    if (!data?.checkoutUrl) return;
    setLoading(true);
    try {
      if ((window as any).openai?.openExternal) {
        await (window as any).openai.openExternal({ url: data.checkoutUrl });
      } else {
        window.open(data.checkoutUrl, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  const products = data?.products ?? [];
  const checkoutUrl = data?.checkoutUrl ?? null;
  const companyName = data?.company?.name ?? null;

  // Compute total from products
  const total = products.reduce((sum, p) => sum + parseFloat(p.price || "0"), 0);
  const currency = products[0]?.currency ?? "USD";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {!data ? (
        <div className="state-box">
          <div className="state-icon">🛒</div>
          <div className="state-text">Preparing your checkout…</div>
          <div className="state-sub">This will only take a moment</div>
        </div>
      ) : (
        <div className="checkout-card">

          {/* Header */}
          <div className="checkout-header">
            {companyName && (
              <p className="checkout-company">{companyName}</p>
            )}
            <h2 className="checkout-title">
              🛒 Your Order
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
              <span className="total-label">Total</span>
              <span className="total-amount">
                {currency} {total.toFixed(2)}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="checkout-footer">
            {data.expiresAt && (
              <div className="expires-badge">
                ⏳ Expires {new Date(data.expiresAt).toLocaleString()}
              </div>
            )}

            {checkoutUrl ? (
              <button
                className="btn-primary"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? "Opening…" : "Complete Purchase →"}
              </button>
            ) : (
              <p className="no-url">No checkout URL available.</p>
            )}
          </div>

        </div>
      )}
    </>
  );
}

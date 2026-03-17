import { useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type FeaturedImage = {
  url: string;
  altText?: string | null;
  width?: number;
  height?: number;
};

type Product = {
  id: string;
  title: string;
  handle?: string | null;
  description?: string | null;
  status?: string;
  featuredImage?: FeaturedImage | null;
  priceMinAmount?: string | null;
  priceMaxAmount?: string | null;
  currencyCode?: string | null;
  totalInventory?: number | null;
  companyId?: string;
};

type Company = {
  id?: string;
  name?: string | null;
  slug?: string | null;
};

type Pagination = {
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

type ProductListPayload = {
  data?: Product[];
  company?: Company | null;
  pagination?: Pagination | null;
};

// ── Design tokens ─────────────────────────────────────────────────────────────

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
    --border:         rgba(0, 255, 136, 0.14);
    --border-bright:  rgba(0, 255, 136, 0.35);
    --shadow-card:    0 0 0 1px rgba(0,255,136,0.10), 3px 3px 0 0 rgba(0,0,0,0.6);
    --shadow-hover:   0 0 0 1px rgba(0,255,136,0.30), 0 0 20px rgba(0,255,136,0.15), 3px 3px 0 0 rgba(0,0,0,0.8);
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
  ::-webkit-scrollbar { height: 4px; width: 4px; }
  ::-webkit-scrollbar-track { background: var(--black-3); }
  ::-webkit-scrollbar-thumb { background: var(--green-dark); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--green); box-shadow: 0 0 6px var(--green); }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .header-title {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 400;
    color: var(--green);
    letter-spacing: 0.04em;
    text-shadow: 0 0 12px rgba(0,255,136,0.5);
  }
  .header-title::before { content: "> "; opacity: 0.5; }
  .header-count {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--green-dim);
    background: rgba(0,255,136,0.06);
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid var(--border);
  }

  /* ── Horizontal scroll strip ── */
  .grid {
    display: flex;
    flex-direction: row;
    gap: 12px;
    overflow-x: auto;
    overflow-y: visible;
    padding-bottom: 8px;
    padding-right: 4px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .grid::-webkit-scrollbar { height: 3px; }
  .grid::-webkit-scrollbar-track { background: var(--black-3); border-radius: 4px; }
  .grid::-webkit-scrollbar-thumb { background: var(--green-dark); border-radius: 4px; }
  .grid::-webkit-scrollbar-thumb:hover { background: var(--green); }

  /* ── Card ── */
  .card {
    position: relative;
    overflow: hidden;
    background: var(--black-2);
    border: 1px solid var(--border);
    border-top-color: rgba(0,255,136,0.22);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
    cursor: default;

    /* Fixed width — shows ~2.5 cards hinting scroll */
    flex: 0 0 190px;
    width: 190px;
    scroll-snap-align: start;
  }
  .card:hover {
    border-color: var(--border-bright);
    box-shadow: var(--shadow-hover);
    transform: translate(-1px, -2px);
  }

  /* Neon corner glow orbs */
  .card::before, .card::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(30px);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .card::before {
    width: 80px; height: 80px;
    top: -20px; left: -10px;
    background: radial-gradient(circle, rgba(0,255,136,0.25) 0%, transparent 70%);
  }
  .card::after {
    width: 60px; height: 60px;
    bottom: -15px; right: -10px;
    background: radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%);
  }
  .card:hover::before, .card:hover::after { opacity: 1; }
  .card > * { position: relative; z-index: 1; }

  /* ── Image ── */
  .card-img-wrap {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border-radius: calc(var(--radius) - 1px) calc(var(--radius) - 1px) 0 0;
    background: var(--black-3);
    flex-shrink: 0;
    position: relative;
  }
  /* Neon scan-line overlay on image */
  .card-img-wrap::after {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.08) 2px,
      rgba(0,0,0,0.08) 4px
    );
    pointer-events: none;
    z-index: 1;
  }
  .card-img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
    filter: saturate(0.9) brightness(0.95);
  }
  .card:hover .card-img {
    transform: scale(1.05);
    filter: saturate(1.1) brightness(1.0);
  }
  .card-img-placeholder {
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--black-3);
    color: var(--grey-dim);
    font-size: 28px;
  }

  /* ── Card body ── */
  .card-body {
    padding: 10px 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
  }
  .card-title {
    font-family: var(--font-label);
    font-size: 12px;
    font-weight: 600;
    color: var(--white);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-price {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 400;
    color: var(--green);
    letter-spacing: 0.02em;
    text-shadow: 0 0 8px rgba(0,255,136,0.4);
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    font-weight: 500;
    font-family: var(--font-mono);
    padding: 1px 6px;
    border-radius: 3px;
  }
  .badge-stock {
    background: rgba(0,255,136,0.07);
    color: var(--green-dim);
    border: 1px solid rgba(0,255,136,0.15);
  }
  .badge-out {
    background: rgba(255,60,60,0.08);
    color: #FF6060;
    border: 1px solid rgba(255,60,60,0.2);
  }

  /* ── Divider ── */
  .card-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(0,255,136,0.12), transparent);
    margin: 0 10px;
  }

  /* ── Button ── */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    color: var(--green);
    border: 1px solid var(--green-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: inset 0 0 0 0 var(--green-glow);
    transition: background 0.18s ease, box-shadow 0.18s ease,
                border-color 0.18s ease, transform 0.14s ease, color 0.18s ease;
  }
  .btn-primary:hover {
    background: var(--green-glow);
    border-color: var(--green);
    color: #ffffff;
    box-shadow: 0 0 12px var(--green-glow-lg), inset 0 0 8px var(--green-glow);
    transform: translateY(-1px);
  }
  .btn-primary:active { transform: translateY(1px); }
  .btn-primary:disabled {
    opacity: 0.35;
    pointer-events: none;
    color: var(--grey-dim);
    border-color: var(--grey-dim);
  }

  /* ── State boxes ── */
  .state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 12px;
    font-family: var(--font-mono);
  }
  .state-icon { font-size: 32px; opacity: 0.4; }
  .state-text { font-size: 13px; color: var(--green-dim); }
  .state-sub  { font-size: 11px; color: var(--grey); }
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductList() {
  const [data, setData] = useState<ProductListPayload | null>(
    () => (window as any).openai?.toolOutput
       ?? (window as any).claude?.toolOutput
       ?? null
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const onSetGlobals = (event: Event) => {
      const e = event as CustomEvent;
      const toolOutput =
        e.detail?.globals?.toolOutput ??
        (window as any).openai?.toolOutput ??
        (window as any).claude?.toolOutput;
      if (toolOutput) setData(toolOutput);
    };

    window.addEventListener("openai:set_globals", onSetGlobals, { passive: true });
    window.addEventListener("claude:set_globals", onSetGlobals, { passive: true });
    return () => {
      window.removeEventListener("openai:set_globals", onSetGlobals);
      window.removeEventListener("claude:set_globals", onSetGlobals);
    };
  }, []);

  const handleBuyNow = async (product: Product) => {
    setLoadingId(product.id);
    try {
      const callTool =
        (window as any).openai?.callTool ??
        (window as any).claude?.callTool;
      await callTool?.("create_checkout", {
        companyName: data?.company?.slug ?? data?.company?.name,
        productIds: [product.id],
      });
    } finally {
      setLoadingId(null);
    }
  };

  const formatPrice = (p: Product) => {
    if (!p.priceMinAmount) return "N/A";
    return `$${parseFloat(p.priceMinAmount).toFixed(2)} ${p.currencyCode ?? "USD"}`;
  };

  const products = data?.data ?? [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {!data ? (
        <div className="state-box">
          <div className="state-icon">🏂</div>
          <div className="state-text">// loading products...</div>
          <div className="state-sub">fetching from immortel catalog</div>
        </div>
      ) : products.length === 0 ? (
        <div className="state-box">
          <div className="state-icon">📭</div>
          <div className="state-text">// no results found</div>
          <div className="state-sub">try a different search or company</div>
        </div>
      ) : (
        <>
          <div className="header">
            {data.company?.name && (
              <span className="header-title">{data.company.name}</span>
            )}
            <span className="header-count">
              {data.pagination?.total ?? products.length} products
            </span>
          </div>

          <div className="grid">
            {products.map((product) => {
              const inStock =
                typeof product.totalInventory === "number"
                  ? product.totalInventory > 0
                  : true;

              return (
                <div key={product.id} className="card">
                  <div className="card-img-wrap">
                    {product.featuredImage?.url ? (
                      <img
                        src={product.featuredImage.url}
                        alt={product.featuredImage.altText ?? product.title}
                        className="card-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="card-img-placeholder">🏂</div>
                    )}
                  </div>

                  <div className="card-body">
                    <h3 className="card-title">{product.title}</h3>
                    <p className="card-price">{formatPrice(product)}</p>
                    <div className="card-meta">
                      {typeof product.totalInventory === "number" && (
                        <span className={`badge ${inStock ? "badge-stock" : "badge-out"}`}>
                          {inStock
                            ? `● ${product.totalInventory} in stock`
                            : `✕ out of stock`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-divider" />

                  <div style={{ padding: "8px 10px 10px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleBuyNow(product)}
                      disabled={loadingId === product.id || !inStock}
                    >
                      {loadingId === product.id
                        ? "// adding..."
                        : inStock
                        ? "> Check In Website"
                        : "// unavailable"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

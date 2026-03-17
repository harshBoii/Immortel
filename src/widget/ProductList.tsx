import { useEffect, useState, useRef } from "react";

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

// ── Design tokens (inlined for iframe isolation) ─────────────────────────────

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
    --radius:         12px;
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

  /* ── Header ── */
  .header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 16px;
  }
  .header-title {
    font-family: var(--font-heading);
    font-size: 20px;
    font-weight: 700;
    color: var(--navy);
    letter-spacing: -0.02em;
  }
  .header-count {
    font-family: var(--font-label);
    font-size: 12px;
    font-weight: 500;
    color: var(--navy-grey);
    background: rgba(21,29,53,0.06);
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid rgba(21,29,53,0.08);
  }

  /* ── Grid ── */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  /* ── Card ── */
  .card {
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
    transition: box-shadow 0.22s ease, transform 0.22s ease, background 0.22s ease;
    cursor: default;
  }
  .card:hover {
    background: rgba(250, 248, 242, 0.88);
    box-shadow: var(--shadow-hover);
    transform: translate(-1px, -1px);
  }

  /* Bokeh orbs on card */
  .card::before, .card::after {
    content: "";
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    filter: blur(36px);
    opacity: 0.5;
  }
  .card::before {
    width: 90px; height: 90px;
    top: -20px; left: -15px;
    background: radial-gradient(circle, rgba(196,85,10,0.22) 0%, transparent 70%);
  }
  .card::after {
    width: 80px; height: 80px;
    bottom: -20px; right: -15px;
    background: radial-gradient(circle, rgba(21,29,53,0.14) 0%, transparent 70%);
  }
  .card > * { position: relative; z-index: 1; }

  /* ── Image ── */
  .card-img-wrap {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border-radius: calc(var(--radius) - 2px) calc(var(--radius) - 2px) 0 0;
    background: var(--parchment-2);
    flex-shrink: 0;
  }
  .card-img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }
  .card:hover .card-img { transform: scale(1.04); }
  .card-img-placeholder {
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(250,248,242,0.8) 0%, rgba(224,226,236,0.5) 100%);
    color: var(--navy-grey);
    font-size: 28px;
  }

  /* ── Card body ── */
  .card-body {
    padding: 12px 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .card-title {
    font-family: var(--font-label);
    font-size: 13px;
    font-weight: 600;
    color: var(--navy);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card-price {
    font-family: var(--font-label);
    font-size: 15px;
    font-weight: 700;
    color: var(--orange-dark);
    letter-spacing: -0.01em;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--font-label);
    padding: 2px 7px;
    border-radius: 20px;
  }
  .badge-stock {
    background: rgba(21,29,53,0.05);
    color: var(--navy-grey);
    border: 1px solid rgba(21,29,53,0.08);
  }
  .badge-out {
    background: rgba(196,85,10,0.07);
    color: var(--orange);
    border: 1px solid rgba(196,85,10,0.15);
  }

  /* ── Button ── */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
    padding: 9px 14px;
    margin-top: auto;
    background: var(--orange);
    color: var(--parchment);
    border: 1px solid var(--orange-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-label);
    font-size: 13px;
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
  .btn-primary:disabled { opacity: 0.5; pointer-events: none; }

  /* ── Divider ── */
  .card-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(21,29,53,0.08), transparent);
    margin: 0 12px;
  }

  /* ── Empty / loading state ── */
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

export default function ProductList() {
  const [data, setData] = useState<ProductListPayload | null>(
    () => (window as any).openai?.toolOutput ?? null
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

  const handleBuyNow = async (product: Product) => {
    setLoadingId(product.id);
    try {
      await (window as any).openai?.callTool?.("create_checkout", {
        companyName: data?.company?.slug ?? data?.company?.name,
        productIds: [product.id],
      });
    } finally {
      setLoadingId(null);
    }
  };

  const formatPrice = (p: Product) => {
    if (!p.priceMinAmount) return "Price unavailable";
    const amount = parseFloat(p.priceMinAmount).toFixed(2);
    const currency = p.currencyCode ?? "USD";
    return `$${amount} ${currency}`;
  };

  const products = data?.data ?? [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {!data ? (
        <div className="state-box">
          <div className="state-icon">🏂</div>
          <div className="state-text">Loading products…</div>
          <div className="state-sub">Fetching from Immortel catalog</div>
        </div>
      ) : products.length === 0 ? (
        <div className="state-box">
          <div className="state-icon">📭</div>
          <div className="state-text">No products found</div>
          <div className="state-sub">Try a different search or company</div>
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
                  {/* Image */}
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

                  {/* Body */}
                  <div className="card-body">
                    <h3 className="card-title">{product.title}</h3>
                    <p className="card-price">{formatPrice(product)}</p>

                    <div className="card-meta">
                      {typeof product.totalInventory === "number" && (
                        <span className={`badge ${inStock ? "badge-stock" : "badge-out"}`}>
                          {inStock ? "📦" : "⚠️"}{" "}
                          {inStock
                            ? `${product.totalInventory} in stock`
                            : "Out of stock"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-divider" />

                  <div style={{ padding: "10px 12px 12px" }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleBuyNow(product)}
                      disabled={loadingId === product.id || !inStock}
                    >
                      {loadingId === product.id ? (
                        <>⏳ Adding…</>
                      ) : inStock ? (
                        <>🛒 Buy Now</>
                      ) : (
                        <>Unavailable</>
                      )}
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

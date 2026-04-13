'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

/* ── types ── */
type ProductItem = { id: string; title: string };

type InventoryOption = {
  id: string;
  source: string;
  title: string;
};

type HealthStatus = {
  ok: boolean;
  message: string;
  raw: unknown;
};

type SubmitMessage = {
  type: 'success' | 'error';
  text: string;
  detail?: string | null;
};

/* ── tiny inline icons ── */
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.94-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconZap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconActivity = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconAlertTriangle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

/* ── constants ── */

const LANGUAGE_OPTIONS = [
  { value: 'english',  label: 'English' },
  { value: 'hindi',    label: 'Hindi'   },
  {value: 'marathi',   label: 'Marathi' },
  {value: 'kannada',   label: 'Kannada' },
  {value: 'telugu',    label: 'Telugu' },
  {value: 'tamil',     label: 'Tamil' },
  {value: 'malayalam', label: 'Malayalam' },
  {value: 'punjabi',   label: 'Punjabi' },
  {value: 'bengali',   label: 'Bengali' },
  {value: 'gujarati',  label: 'Gujarati' },
];

const PRODUCT_SOURCE = { shopify: 'shopify', woocommerce: 'woocommerce', custom: 'custom' };
const VOICE_MODE     = { quality: 'quality', speed: 'speed', luxury: 'eleven_v3' };
const DEFAULT_VOICE_ID = 'oO7sLA3dWfQXsKeSAjpA';

const LLM_PROVIDER_OPTIONS = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'groq',   label: 'Groq'   },
] as const;
type LlmProviderValue = (typeof LLM_PROVIDER_OPTIONS)[number]['value'];

/* ── reusable field label ── */
const FieldLabel = ({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
}) => (
  <label htmlFor={htmlFor} className="block mb-1.5">
    <span className="text-[12px] font-semibold text-foreground/80">{children}</span>
    {hint && <span className="block text-[11px] text-muted-foreground/60 font-normal mt-0.5 leading-snug">{hint}</span>}
  </label>
);

/* ── shared input class ── */
const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] placeholder:text-muted-foreground/35 transition-colors';

/* ── section wrapper with header ── */
const FormSection = ({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-[var(--glass-border)] overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--glass-border)] bg-[var(--glass-hover)]/60">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--sibling-primary)]/12 text-[var(--sibling-primary)] flex-shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-none">{title}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </div>
    <div className="p-5 space-y-4 bg-[var(--glass-hover)]/25">{children}</div>
  </div>
);

/* ── pill toggle ── */
const PillToggle = ({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={`relative px-3.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-150 ${
          value === o.id
            ? 'border-[var(--sibling-primary)] bg-[var(--sibling-primary)]/12 text-[var(--sibling-primary)]'
            : 'border-[var(--glass-border)] bg-transparent text-muted-foreground hover:text-foreground'
        }`}
      >
        {o.label}
        {value === o.id && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--sibling-primary)]">
            <span className="text-white" style={{ fontSize: 7, lineHeight: 1 }}>✓</span>
          </span>
        )}
      </button>
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function CallCenterPage() {
  const { company, loading: contextLoading, error: contextError } = useCurrentContext();

  const [phone,               setPhone]               = useState('');
  const [contactName,         setContactName]         = useState('');
  const [companyName,         setCompanyName]         = useState('');
  const [languageMode,        setLanguageMode]        = useState('english');
  const [voiceMode,           setVoiceMode]           = useState(VOICE_MODE.speed);   // ← speed default
  const [voiceId,             setVoiceId]             = useState(DEFAULT_VOICE_ID);
  const [llmProvider,         setLlmProvider]         = useState<LlmProviderValue>('groq');
  const [productSource,       setProductSource]       = useState(PRODUCT_SOURCE.shopify);
  const [shopifyProducts,     setShopifyProducts]     = useState<ProductItem[]>([]);
  const [wooProducts,         setWooProducts]         = useState<ProductItem[]>([]);
  const [inventoryLoading,    setInventoryLoading]    = useState(true);
  const [inventoryError,      setInventoryError]      = useState<string | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [customProductTitle,  setCustomProductTitle]  = useState('');
  const [perks,               setPerks]               = useState('');
  const [infoAboutLead,       setInfoAboutLead]       = useState('');
  const [healthStatus,        setHealthStatus]        = useState<HealthStatus | null>(null);
  const [healthBusy,          setHealthBusy]          = useState(false);
  const [submitBusy,          setSubmitBusy]          = useState(false);
  const [submitMessage,       setSubmitMessage]       = useState<SubmitMessage | null>(null);

  useEffect(() => {
    if (company?.name) setCompanyName((prev) => (prev === '' ? company.name : prev));
  }, [company?.name]);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const [shopRes, wooRes] = await Promise.all([
        fetch('/api/shop/products', { credentials: 'include' }),
        fetch('/api/shop/woocommerce-products', { credentials: 'include' }),
      ]);
      const shopJson = await shopRes.json().catch(() => ({}));
      const wooJson  = await wooRes.json().catch(() => ({}));
      setShopifyProducts(shopRes.ok && shopJson.success && Array.isArray(shopJson.data) ? shopJson.data : []);
      setWooProducts(wooRes.ok && wooJson.success && Array.isArray(wooJson.data) ? wooJson.data : []);
    } catch (e) {
      console.error(e);
      setInventoryError('Catalog load failed — check connections.');
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const inventoryOptions = useMemo<InventoryOption[]>(() => [
    ...shopifyProducts.map((p) => ({ id: `shopify:${p.id}`, source: PRODUCT_SOURCE.shopify,     title: p.title })),
    ...wooProducts.map((p)     => ({ id: `woo:${p.id}`,     source: PRODUCT_SOURCE.woocommerce, title: p.title })),
  ], [shopifyProducts, wooProducts]);

  useEffect(() => {
    if (productSource === PRODUCT_SOURCE.custom) { setSelectedInventoryId(''); return; }
    const firstOfSource = inventoryOptions.find((o) => o.source === productSource);
    setSelectedInventoryId((prev) => {
      if (prev && inventoryOptions.some((o) => o.id === prev && o.source === productSource)) return prev;
      return firstOfSource?.id ?? '';
    });
  }, [productSource, inventoryOptions]);

  const resolvedProduct = useMemo(() => {
    if (productSource === PRODUCT_SOURCE.custom) return customProductTitle.trim();
    return inventoryOptions.find((o) => o.id === selectedInventoryId)?.title?.trim() ?? '';
  }, [productSource, customProductTitle, selectedInventoryId, inventoryOptions]);

  const checkHealth = async () => {
    setHealthBusy(true);
    setHealthStatus(null);
    try {
      const res  = await fetch('/api/calling-agent/health', { credentials: 'include' });
      const json = await res.json().catch(() => null);
      const ok   = res.ok && json?.success !== false && (json?.data?.ok === true || json?.data?.ok === 'True');
      setHealthStatus({
        ok,
        message: ok
          ? 'Line is hot — agent is standing by.'
          : (json?.error as string) || (json?.data?.error as string) || 'Agent not responding.',
        raw: json,
      });
    } catch {
      setHealthStatus({ ok: false, message: 'Could not reach the calling service.', raw: null });
    } finally {
      setHealthBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    const to = phone.trim().startsWith('+')
      ? phone.trim()
      : phone.trim() ? `+${phone.trim().replace(/^\+/, '')}` : '';

    if (!to || !contactName.trim() || !companyName.trim() || !resolvedProduct) {
      setSubmitMessage({ type: 'error', text: 'Phone, name, company, and a product are all needed before we dial.' });
      return;
    }
    setSubmitBusy(true);
    try {
      const payload = {
        to,
        name:             contactName.trim(),
        company:          companyName.trim(),
        product:          resolvedProduct,
        perks_of_product: perks.trim() || '—',
        info_about_lead:  infoAboutLead.trim() || '—',
        languageMode,
        voiceMode,
        voiceId:          voiceId.trim() || DEFAULT_VOICE_ID,
        llm_provider:     llmProvider,
        language:         languageMode,
        deepgram_language: languageMode === "hindi" ? "hi" : languageMode === "english" ? "en" : "multi",
   
      };

      console.log('[call-center] outbound payload', payload);

      const res  = await fetch('/api/calling-agent/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success !== false) {
        setSubmitMessage({
          type:   'success',
          text:   `Call queued for ${contactName.trim()}. The agent picks up from here.`,
          detail: json?.data != null ? JSON.stringify(json.data) : null,
        });
      } else {
        setSubmitMessage({
          type:   'error',
          text:   (json?.error as string) || (json?.data?.error as string) || 'Something blocked the call request.',
          detail: json?.data != null ? JSON.stringify(json.data) : null,
        });
      }
    } catch (err) {
      console.error(err);
      setSubmitMessage({ type: 'error', text: 'Network dropped. Try again.' });
    } finally {
      setSubmitBusy(false);
    }
  };

  const previewReady = phone.trim() && contactName.trim() && resolvedProduct;
  const langLabel    = LANGUAGE_OPTIONS.find((l) => l.value === languageMode)?.label ?? languageMode;

  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-12 pt-2">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sibling-primary)]/10">
              <IconPhone />
            </span>
            <h1 className="text-2xl font-semibold text-foreground font-heading tracking-tight">
              Voice Drop
            </h1>
          </div>
          <p className="text-[13px] text-muted-foreground max-w-lg leading-relaxed">
            Brief the agent, pick a product, and hit fire and your AI rep handles the rest.{' '}
            <span className="text-muted-foreground/50">
              Workspace pre-fills the company. Catalog pulls live from Shopify &amp; WooCommerce.
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={checkHealth}
          disabled={healthBusy || contextLoading}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border border-[var(--glass-border)] bg-[var(--glass-hover)]/60 hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
        >
          <IconActivity />
          {healthBusy ? 'Pinging…' : 'Ping agent'}
        </button>
      </div>

      {/* ── Health banner ── */}
      {healthStatus && (
        <div className={`mt-3 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px] ${
          healthStatus.ok
            ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400'
            : 'border-destructive/30 bg-destructive/8 text-destructive'
        }`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full flex-shrink-0 ${healthStatus.ok ? 'bg-emerald-500/15' : 'bg-destructive/15'}`}>
            {healthStatus.ok ? <IconCheck /> : <IconAlertTriangle />}
          </span>
          {healthStatus.message}
        </div>
      )}

      {/* ── Context error ── */}
      {contextError && (
        <div className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/8 text-[13px] text-destructive">
          <IconAlertTriangle />
          {contextError}
        </div>
      )}

      {contextLoading ? (
        <div className="mt-8 flex items-center gap-2 text-[13px] text-muted-foreground">
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[var(--sibling-primary)] border-t-transparent animate-spin" />
          Loading workspace…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          {/* ── Section 1: Who are we calling ── */}
          <FormSection
            icon={<IconUser />}
            title="Who are we calling?"
            description="The lead this voice drop is aimed at"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel hint="E.164 format — starts with country code">
                  Their number
                </FieldLabel>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </div>
              <div>
                <FieldLabel hint="How the agent addresses them">
                  First name to use
                </FieldLabel>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={inputCls}
                  placeholder="Samaira"
                />
              </div>
            </div>

            <div>
              <FieldLabel hint="Defaults to your workspace — edit if calling on behalf of another">
                Calling from
              </FieldLabel>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputCls}
                placeholder="Immortell"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel hint="Sets Deepgram transcription locale">
                  Conversation language
                </FieldLabel>
                <select
                  value={languageMode}
                  onChange={(e) => setLanguageMode(e.target.value)}
                  className={inputCls}
                >
                  {LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel hint={
                  voiceMode === VOICE_MODE.quality
                    ? <><code className="text-[10px] font-mono bg-[var(--glass-border)]/40 px-1 rounded">eleven_multilingual_v2</code> — richer, slower</>
                    : voiceMode === VOICE_MODE.luxury
                      ? <><code className="text-[10px] font-mono bg-[var(--glass-border)]/40 px-1 rounded">eleven_v3</code> — flagship, most expressive</>
                      : <><code className="text-[10px] font-mono bg-[var(--glass-border)]/40 px-1 rounded">eleven_flash_v2_5</code> — instant, leaner</>
                }>
                  Voice priority
                </FieldLabel>
                <PillToggle
                  options={[
                    { id: VOICE_MODE.quality, label: '✦ Quality' },
                    { id: VOICE_MODE.speed,   label: '⚡ Speed'   },
                    { id: VOICE_MODE.luxury,  label: '◆ Luxury'  },
                  ]}
                  value={voiceMode}
                  onChange={setVoiceMode}
                />
              </div>
            </div>

            <div>
              <FieldLabel
                htmlFor="call-center-llm-provider"
                hint={
                  <>
                    Sent as{' '}
                    <code className="text-[10px] font-mono bg-[var(--glass-border)]/40 px-1 rounded">llm_provider</code>
                  </>
                }
              >
                LLM provider
              </FieldLabel>
              <select
                id="call-center-llm-provider"
                name="llm_provider"
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value as LlmProviderValue)}
                className={inputCls}
              >
                {LLM_PROVIDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel
                htmlFor="call-center-voice-id"
                hint={
                  <>
                    ElevenLabs <code className="text-[10px] font-mono bg-[var(--glass-border)]/40 px-1 rounded">voiceId</code>{' '}
                    — sent on every outbound call
                  </>
                }
              >
                Voice ID
              </FieldLabel>
              <input
                id="call-center-voice-id"
                name="voiceId"
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className={`${inputCls} font-mono text-[13px]`}
                placeholder={DEFAULT_VOICE_ID}
                autoComplete="off"
              />
            </div>
          </FormSection>

          {/* ── Section 2: What are we pitching ── */}
          <FormSection
            icon={<IconBox />}
            title="What are we pitching?"
            description="The agent leads with this product and your perks angle"
          >
            <div>
              <FieldLabel>Where is the product coming from?</FieldLabel>
              <PillToggle
                options={[
                  { id: PRODUCT_SOURCE.shopify,     label: 'Shopify'     },
                  { id: PRODUCT_SOURCE.woocommerce, label: 'WooCommerce' },
                  { id: PRODUCT_SOURCE.custom,      label: 'Custom'      },
                ]}
                value={productSource}
                onChange={setProductSource}
              />
            </div>

            {productSource !== PRODUCT_SOURCE.custom ? (
              <div>
                <FieldLabel hint={inventoryLoading ? 'Pulling catalog…' : inventoryError ?? undefined}>
                  Pick the product
                </FieldLabel>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  disabled={inventoryLoading || inventoryOptions.filter((o) => o.source === productSource).length === 0}
                  className={`${inputCls} disabled:opacity-50`}
                >
                  {inventoryOptions.filter((o) => o.source === productSource).length === 0 ? (
                    <option value="">Nothing synced yet in this catalog</option>
                  ) : (
                    inventoryOptions
                      .filter((o) => o.source === productSource)
                      .map((o) => <option key={o.id} value={o.id}>{o.title}</option>)
                  )}
                </select>
                {inventoryLoading && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                    <span className="inline-block w-3 h-3 rounded-full border border-[var(--sibling-primary)] border-t-transparent animate-spin" />
                    Syncing catalogs…
                  </div>
                )}
              </div>
            ) : (
              <div>
                <FieldLabel hint="Free-text — agent reads this verbatim as the product">
                  Name the offering
                </FieldLabel>
                <input
                  type="text"
                  value={customProductTitle}
                  onChange={(e) => setCustomProductTitle(e.target.value)}
                  className={inputCls}
                  placeholder="GEO authority package, monthly retainer"
                />
              </div>
            )}

            <div>
              <FieldLabel hint="Hook the agent opens with — discount, bonus, limited window">
                The hook (optional)
              </FieldLabel>
              <input
                type="text"
                value={perks}
                onChange={(e) => setPerks(e.target.value)}
                className={inputCls}
                placeholder="First month 10% off, onboarding included"
              />
            </div>

            <div>
              <FieldLabel
                htmlFor="call-center-info-about-lead"
                hint={
                  <>
                    Sent as{' '}
                    <code className="text-[10px] font-mono bg-[var(--glass-border)]/40 px-1 rounded">
                      info_about_lead
                    </code>{' '}
                    — the more context, the sharper the conversation
                  </>
                }
              >
                Intel on this lead
              </FieldLabel>
              <textarea
                id="call-center-info-about-lead"
                name="info_about_lead"
                value={infoAboutLead}
                onChange={(e) => setInfoAboutLead(e.target.value)}
                rows={4}
                className={`${inputCls} resize-y min-h-[96px]`}
                placeholder="Runs a boutique maternity brand, asked about visibility last week, open to a 15-min call on Fridays."
              />
            </div>
          </FormSection>

          {/* ── Call preview strip ── */}
          {previewReady && (
            <div className="rounded-xl border border-[var(--sibling-primary)]/20 bg-[var(--sibling-primary)]/5 px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-[var(--sibling-primary)]">Ready to dial · </span>
              calling <span className="font-semibold text-foreground">{contactName.trim()}</span> at{' '}
              <span className="font-mono text-foreground">{phone.trim()}</span> · pitching{' '}
              <span className="font-semibold text-foreground">{resolvedProduct}</span> · in{' '}
              {langLabel} ·{' '}
              {voiceMode === VOICE_MODE.quality
                ? 'quality'
                : voiceMode === VOICE_MODE.luxury
                  ? 'luxury'
                  : 'fast'}{' '}
              voice
            </div>
          )}

          {/* ── Submit feedback ── */}
          {submitMessage && (
            <div className={`flex gap-3 px-4 py-3.5 rounded-xl border text-[13px] ${
              submitMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400'
                : 'border-destructive/30 bg-destructive/8 text-destructive'
            }`}>
              <span className={`mt-0.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full ${submitMessage.type === 'success' ? 'bg-emerald-500/15' : 'bg-destructive/15'}`}>
                {submitMessage.type === 'success' ? <IconCheck /> : <IconAlertTriangle />}
              </span>
              <div>
                <p>{submitMessage.text}</p>
                {submitMessage.detail && (
                  <pre className="mt-2 text-[11px] whitespace-pre-wrap break-all opacity-70 font-mono">
                    {submitMessage.detail}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitBusy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold border border-[var(--sibling-primary)] bg-[var(--sibling-primary)] hover:opacity-90 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_16px_-4px_var(--sibling-primary)]"
            >
              {submitBusy ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Queueing…
                </>
              ) : (
                <>
                  <IconZap />
                  Drop the call
                </>
              )}
            </button>
            {!previewReady && (
              <span className="text-[11px] text-muted-foreground/45">
                Fill phone, name &amp; product to unlock
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

/* ── Access gate ── */
const CALL_CENTER_PASSWORD = 'Immortell';
const CALL_CENTER_UNLOCK_KEY = 'call-center-unlocked';

const IconLock = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PasswordGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === CALL_CENTER_PASSWORD) {
      try { sessionStorage.setItem(CALL_CENTER_UNLOCK_KEY, '1'); } catch { /* ignore */ }
      onUnlock();
    } else {
      setErr('Try again — wrong password.');
      setPwd('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/90 backdrop-blur-md p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sibling-primary)]/12 text-[var(--sibling-primary)]">
            <IconLock />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground leading-tight">
              Restricted area
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Enter the password to access the Calling Agent.
            </p>
          </div>
        </div>

        <label htmlFor="cc-gate-pwd" className="block text-[11px] font-semibold uppercase tracking-wide text-foreground/70 mb-1.5">
          Password
        </label>
        <input
          id="cc-gate-pwd"
          type="password"
          autoFocus
          autoComplete="off"
          value={pwd}
          onChange={(e) => { setPwd(e.target.value); if (err) setErr(null); }}
          className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] placeholder:text-muted-foreground/35 transition-colors"
          placeholder="••••••••"
        />

        {err && (
          <p className="mt-2 text-[12px] text-destructive">{err}</p>
        )}

        <button
          type="submit"
          disabled={!pwd}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--sibling-primary)] hover:opacity-90 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Unlock
        </button>
      </form>
    </div>
  );
};

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

/* ── icons ── */
const IconPhone = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l.94-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconZap = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconActivity = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconCheck = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconAlertTriangle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconBot = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);
const IconSparkles = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.88 5.76a1 1 0 0 0 .95.69h6.06l-4.9 3.56a1 1 0 0 0-.36 1.12L17.5 20l-4.9-3.56a1 1 0 0 0-1.18 0L6.5 20l1.87-5.87a1 1 0 0 0-.36-1.12L3.11 9.45h6.06a1 1 0 0 0 .95-.69L12 3z" />
  </svg>
);
const IconMic = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);
const IconCpu = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
  </svg>
);
const IconMessageSquare = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconHelpCircle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ── constants ── */
const LANGUAGE_OPTIONS = [
  { value: 'english',   label: 'English'   },
  { value: 'hindi',     label: 'Hindi'     },
  { value: 'marathi',   label: 'Marathi'   },
  { value: 'kannada',   label: 'Kannada'   },
  { value: 'telugu',    label: 'Telugu'    },
  { value: 'tamil',     label: 'Tamil'     },
  { value: 'malayalam', label: 'Malayalam' },
  { value: 'punjabi',   label: 'Punjabi'   },
  { value: 'bengali',   label: 'Bengali'   },
  { value: 'gujarati',  label: 'Gujarati'  },
  { value: 'odia',      label: 'Odia'      },
] as const;

type LanguageMode = (typeof LANGUAGE_OPTIONS)[number]['value'];

const DEEPGRAM_LANGUAGE_OPTIONS: Record<LanguageMode, string> = {
  english: 'en', hindi: 'hi', marathi: 'mr', kannada: 'kn', telugu: 'te',
  tamil: 'ta', malayalam: 'ml', punjabi: 'pa', bengali: 'bn', gujarati: 'gu', odia: 'or',
};

const PRODUCT_SOURCE = { shopify: 'shopify', woocommerce: 'woocommerce', custom: 'custom' };
const VOICE_MODE     = { quality: 'quality', speed: 'speed', luxury: 'eleven_v3' };
const DEFAULT_VOICE_ID = 'oO7sLA3dWfQXsKeSAjpA';

const LLM_PROVIDER_OPTIONS = [
  { value: 'groq',   label: 'Groq',   hint: 'Fastest inference' },
  { value: 'gemini', label: 'Gemini', hint: 'Multimodal'        },
  { value: 'openai', label: 'OpenAI', hint: 'GPT-4o'            },
  { value: 'claude', label: 'Claude', hint: 'Most nuanced'      },
  { value: 'sarvam', label: 'Sarvam', hint: 'Indian languages'    },
] as const;
type LlmProviderValue = (typeof LLM_PROVIDER_OPTIONS)[number]['value'];

const SARVAM_SPEAKER_OPTIONS = [
  { value: 'rohan', label: 'Rohan' },
  { value: 'dev',   label: 'Dev' },
  { value: 'sunny', label: 'Sunny' },
] as const;
type SarvamSpeaker = (typeof SARVAM_SPEAKER_OPTIONS)[number]['value'];

/* ─── sub-components ─────────────────────────────────── */

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] placeholder:text-muted-foreground/35 transition-colors';

const FieldLabel = ({
  children, hint, htmlFor,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor?: string;
}) => (
  <label htmlFor={htmlFor} className="block mb-1.5">
    <span className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wide">{children}</span>
    {hint && <span className="block text-[11px] text-muted-foreground/55 font-normal mt-0.5 leading-snug normal-case tracking-normal">{hint}</span>}
  </label>
);

/* Pill toggle — horizontal compact */
const PillToggle = ({
  options, value, onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div
    role="group"
    className="inline-flex items-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-hover)]/40 p-0.5 gap-0.5"
  >
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150 ${
          value === o.id
            ? 'bg-[var(--sibling-primary)] text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-[var(--glass-hover)]'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/* Card-style section for the LEFT column */
const LeftSection = ({
  icon, title, description, children, step,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  step: number;
}) => (
  <div className="relative rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-hover)]/20 overflow-hidden">
    {/* Step number watermark */}
    <span className="absolute top-3 right-4 text-[42px] font-black text-foreground/[0.03] select-none leading-none pointer-events-none">
      {step < 10 ? `0${step}` : step}
    </span>
    {/* Header */}
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--glass-border)]">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)] flex-shrink-0">
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-foreground leading-none">{title}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground/55 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

/* AI toggle pill — compact inline */
const AiToggle = ({
  checked, onChange, label = 'Auto',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150 ${
      checked
        ? 'border-[var(--sibling-primary)]/40 bg-[var(--sibling-primary)]/10 text-[var(--sibling-primary)]'
        : 'border-[var(--glass-border)] bg-transparent text-muted-foreground hover:text-foreground'
    }`}
  >
    <IconSparkles size={10} />
    {label}
  </button>
);

/* Right panel instruction row */
const InstructionRow = ({
  icon, label, hint, children, aiChecked, onAiChange, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
  aiChecked: boolean;
  onAiChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className={`transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[var(--sibling-primary)]/70 flex-shrink-0">{icon}</span>
        <span className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wide truncate">{label}</span>
      </div>
      <AiToggle checked={aiChecked} onChange={onAiChange} />
    </div>
    {hint && (
      <p className="text-[11px] text-muted-foreground/50 mb-1.5 leading-snug">{hint}</p>
    )}
    <div className={aiChecked ? 'opacity-40 pointer-events-none' : ''}>{children}</div>
    {aiChecked && (
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--sibling-primary)]/80">
        <IconSparkles size={10} />
        <span>AI will generate this automatically</span>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function CallCenterPage() {
  const { company, loading: contextLoading, error: contextError } = useCurrentContext();

  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CALL_CENTER_UNLOCK_KEY) === '1') setUnlocked(true);
    } catch { /* ignore */ }
  }, []);

  const [phone,                setPhone]                = useState('');
  const [contactName,          setContactName]          = useState('');
  const [companyName,          setCompanyName]          = useState('');
  const [languageMode,         setLanguageMode]         = useState<LanguageMode>('english');
  const [voiceMode,            setVoiceMode]            = useState(VOICE_MODE.speed);
  const [voiceId,              setVoiceId]              = useState(DEFAULT_VOICE_ID);
  const [llmProvider,          setLlmProvider]          = useState<LlmProviderValue>('groq');
  const [useAiSystemPrompt,    setUseAiSystemPrompt]    = useState(true);
  const [systemPrompt,         setSystemPrompt]         = useState('');
  const [useAiOpeningGreeting, setUseAiOpeningGreeting] = useState(true);
  const [openingGreeting,      setOpeningGreeting]      = useState('');
  const [useAiAgentName,       setUseAiAgentName]       = useState(true);
  const [agentName,            setAgentName]            = useState('');
  const [useAiAgentRole,       setUseAiAgentRole]       = useState(true);
  const [agentRole,            setAgentRole]            = useState('');
  const [useAiQuestions,       setUseAiQuestions]       = useState(true);
  const [questionsToAsk,       setQuestionsToAsk]       = useState('');
  const [useSarvamTts,         setUseSarvamTts]         = useState(false);
  const [sarvamSpeaker,        setSarvamSpeaker]        = useState<SarvamSpeaker>('rohan');
  const [productSource,        setProductSource]        = useState(PRODUCT_SOURCE.shopify);
  const [shopifyProducts,      setShopifyProducts]      = useState<ProductItem[]>([]);
  const [wooProducts,          setWooProducts]          = useState<ProductItem[]>([]);
  const [inventoryLoading,     setInventoryLoading]     = useState(true);
  const [inventoryError,       setInventoryError]       = useState<string | null>(null);
  const [selectedInventoryId,  setSelectedInventoryId]  = useState('');
  const [customProductTitle,   setCustomProductTitle]   = useState('');
  const [perks,                setPerks]                = useState('');
  const [infoAboutLead,        setInfoAboutLead]        = useState('');
  const [healthStatus,         setHealthStatus]         = useState<HealthStatus | null>(null);
  const [healthBusy,           setHealthBusy]           = useState(false);
  const [submitBusy,           setSubmitBusy]           = useState(false);
  const [submitMessage,        setSubmitMessage]        = useState<SubmitMessage | null>(null);

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
      setSubmitMessage({ type: 'error', text: 'Phone, name, company, and a product are required to dial.' });
      return;
    }
    setSubmitBusy(true);
    try {
      const trimmedQuestions = questionsToAsk
        .split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3).join('\n');

      const payload = {
        to,
        name:              contactName.trim(),
        company:           companyName.trim(),
        product:           resolvedProduct,
        perks_of_product:  perks.trim() || '—',
        info_about_lead:   infoAboutLead.trim() || '—',
        languageMode,
        voiceMode,
        voiceId:           voiceId.trim() || DEFAULT_VOICE_ID,
        llm_provider:      llmProvider,
        language:          languageMode,
        deepgram_language: DEEPGRAM_LANGUAGE_OPTIONS[languageMode] ?? 'en',
        use_sarvam_tts:    useSarvamTts,
        sarvam_speaker:    useSarvamTts ? sarvamSpeaker : undefined,
        system_prompt:     useAiSystemPrompt    ? undefined : (systemPrompt.trim()    || undefined),
        opening_greeting:  useAiOpeningGreeting ? undefined : (openingGreeting.trim() || undefined),
        agent_name:        useAiAgentName       ? undefined : (agentName.trim()       || undefined),
        agent_role:        useAiAgentRole       ? undefined : (agentRole.trim()       || undefined),
        questions_to_ask:  useAiQuestions       ? undefined : (trimmedQuestions       || undefined),
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
  const autoCount    = [useAiSystemPrompt, useAiOpeningGreeting, useAiAgentName, useAiAgentRole, useAiQuestions].filter(Boolean).length;

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-[60vh] px-4 pb-12 pt-2 w-full">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-5 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div className="relative flex-shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sibling-primary)]/12 text-[var(--sibling-primary)]">
              <IconPhone size={18} />
            </span>
            {/* live dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight leading-none">
              Voice Drop
            </h1>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Brief the agent, pick a product, and fire.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent status pill */}
          {healthStatus && (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border ${
              healthStatus.ok
                ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400'
                : 'border-destructive/30 bg-destructive/8 text-destructive'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${healthStatus.ok ? 'bg-emerald-500' : 'bg-destructive'}`} />
              {healthStatus.ok ? 'Agent ready' : 'Agent offline'}
            </span>
          )}
          <button
            type="button"
            onClick={checkHealth}
            disabled={healthBusy || contextLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[var(--glass-border)] bg-[var(--glass-hover)]/60 hover:bg-[var(--glass-hover)] text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
          >
            {healthBusy
              ? <span className="inline-block w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
              : <IconActivity />}
            {healthBusy ? 'Pinging…' : 'Ping agent'}
          </button>
        </div>
      </div>

      {/* ── Context error ── */}
      {contextError && (
        <div className="mb-4 max-w-[1280px] mx-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/8 text-[13px] text-destructive">
          <IconAlertTriangle />
          {contextError}
        </div>
      )}

      {contextLoading ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-8 max-w-[1280px] mx-auto">
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-[var(--sibling-primary)] border-t-transparent animate-spin" />
          Loading workspace…
        </div>
      ) : (
        <form onSubmit={handleSubmit}>

          {/*
           ┌─────────────────────────────────────────────────┐
           │  60% LEFT — call config   │  40% RIGHT — agent  │
           └─────────────────────────────────────────────────┘
          */}
          <div className="max-w-[1280px] mx-auto flex flex-col lg:flex-row gap-5 items-start">

            {/* ════════════════════════════════
                LEFT COLUMN  (60%)
            ════════════════════════════════ */}
            <div className="w-full lg:w-[60%] space-y-4">

              {/* ── Section 1: Who are we calling ── */}
              <LeftSection
                step={1}
                icon={<IconUser />}
                title="Who are we calling?"
                description="Lead details for this voice drop"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel hint="E.164 — include country code">Number</FieldLabel>
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
                    <FieldLabel hint="How the agent addresses them">First name</FieldLabel>
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
                  <FieldLabel hint="Pre-filled from your workspace">Calling from</FieldLabel>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputCls}
                    placeholder="Immortell"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel hint="Deepgram or Sarvam transcription locale">Language</FieldLabel>
                    <select
                      value={languageMode}
                      onChange={(e) => setLanguageMode(e.target.value as LanguageMode)}
                      className={inputCls}
                    >
                      {LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel
                      hint={
                        voiceMode === VOICE_MODE.quality
                          ? 'eleven_multilingual_v2 — richer, slower'
                          : voiceMode === VOICE_MODE.luxury
                            ? 'eleven_v3 — most expressive'
                            : 'eleven_flash_v2_5 — instant response'
                      }
                    >
                      Voice priority
                    </FieldLabel>
                    <PillToggle
                      options={[
                        { id: VOICE_MODE.speed,   label: '⚡ Speed'   },
                        { id: VOICE_MODE.quality, label: '✦ Quality' },
                        { id: VOICE_MODE.luxury,  label: '◆ Luxury'  },
                      ]}
                      value={voiceMode}
                      onChange={setVoiceMode}
                    />
                  </div>
                </div>

                {/* LLM + Voice ID — two column compact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel
                      htmlFor="cc-llm"
                      hint={LLM_PROVIDER_OPTIONS.find((o) => o.value === llmProvider)?.hint}
                    >
                      LLM model
                    </FieldLabel>
                    <select
                      id="cc-llm"
                      value={llmProvider}
                      onChange={(e) => setLlmProvider(e.target.value as LlmProviderValue)}
                      className={inputCls}
                    >
                      {LLM_PROVIDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="cc-voice-id" hint="ElevenLabs voice ID">
                      Voice ID
                    </FieldLabel>
                    <input
                      id="cc-voice-id"
                      type="text"
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className={`${inputCls} font-mono text-[12px]`}
                      placeholder={DEFAULT_VOICE_ID}
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Sarvam TTS */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel hint="Send to agent as use_sarvam_tts">
                      Sarvam TTS
                    </FieldLabel>
                    <label className="flex items-center gap-2 text-[12px] text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        checked={useSarvamTts}
                        onChange={(e) => setUseSarvamTts(e.target.checked)}
                        className="accent-[var(--sibling-primary)]"
                      />
                      Enabled
                    </label>
                    <p className="mt-1 text-[11px] text-muted-foreground/50 leading-snug">
                      Leave off to use your normal voice settings.
                    </p>
                  </div>
                  <div>
                    <FieldLabel htmlFor="cc-sarvam-speaker" hint="Send to agent as sarvam_speaker">
                      Sarvam speaker
                    </FieldLabel>
                    <select
                      id="cc-sarvam-speaker"
                      value={sarvamSpeaker}
                      onChange={(e) => setSarvamSpeaker(e.target.value as SarvamSpeaker)}
                      disabled={!useSarvamTts}
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      {SARVAM_SPEAKER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </LeftSection>

              {/* ── Section 2: What are we pitching ── */}
              <LeftSection
                step={2}
                icon={<IconBox />}
                title="What are we pitching?"
                description="The product and context the agent leads with"
              >
                <div>
                  <FieldLabel>Catalog source</FieldLabel>
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
                      Product
                    </FieldLabel>
                    <select
                      value={selectedInventoryId}
                      onChange={(e) => setSelectedInventoryId(e.target.value)}
                      disabled={inventoryLoading || inventoryOptions.filter((o) => o.source === productSource).length === 0}
                      className={`${inputCls} disabled:opacity-50`}
                    >
                      {inventoryOptions.filter((o) => o.source === productSource).length === 0 ? (
                        <option value="">Nothing synced yet</option>
                      ) : (
                        inventoryOptions
                          .filter((o) => o.source === productSource)
                          .map((o) => <option key={o.id} value={o.id}>{o.title}</option>)
                      )}
                    </select>
                    {inventoryLoading && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                        <span className="inline-block w-3 h-3 rounded-full border border-[var(--sibling-primary)] border-t-transparent animate-spin" />
                        Syncing catalogs…
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <FieldLabel hint="Agent reads this as the product name">Offering name</FieldLabel>
                    <input
                      type="text"
                      value={customProductTitle}
                      onChange={(e) => setCustomProductTitle(e.target.value)}
                      className={inputCls}
                      placeholder="GEO authority package, monthly retainer"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel hint="Discount, bonus, limited window">The hook</FieldLabel>
                    <input
                      type="text"
                      value={perks}
                      onChange={(e) => setPerks(e.target.value)}
                      className={inputCls}
                      placeholder="10% off, onboarding included"
                    />
                  </div>
                  <div>
                    {/* intentionally empty — asymmetric feel */}
                  </div>
                </div>

                <div>
                  <FieldLabel
                    htmlFor="cc-lead-info"
                    hint="The more context you give, the sharper the conversation"
                  >
                    Intel on this lead
                  </FieldLabel>
                  <textarea
                    id="cc-lead-info"
                    value={infoAboutLead}
                    onChange={(e) => setInfoAboutLead(e.target.value)}
                    rows={4}
                    className={`${inputCls} resize-y min-h-[96px]`}
                    placeholder="Runs a boutique maternity brand, asked about visibility last week, open to calls on Fridays."
                  />
                </div>
              </LeftSection>

              {/* ── Call preview strip ── */}
              {previewReady && (
                <div className="rounded-xl border border-[var(--sibling-primary)]/25 bg-[var(--sibling-primary)]/6 px-4 py-3 text-[12px] leading-relaxed">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)]">
                      <IconCheck size={10} />
                    </span>
                    <span className="font-semibold text-[var(--sibling-primary)] text-[11px] uppercase tracking-wide">
                      Ready to dial
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    Calling{' '}
                    <span className="font-semibold text-foreground">{contactName.trim()}</span>
                    {' '}at{' '}
                    <span className="font-mono text-foreground">{phone.trim()}</span>
                    {' '}· pitching{' '}
                    <span className="font-semibold text-foreground">{resolvedProduct}</span>
                    {' '}· {langLabel}{' '}
                    · {voiceMode === VOICE_MODE.luxury ? 'luxury' : voiceMode === VOICE_MODE.quality ? 'quality' : 'fast'} voice
                    {' '}· via <span className="font-semibold text-foreground">{llmProvider}</span>
                  </p>
                </div>
              )}

              {/* ── Submit feedback ── */}
              {submitMessage && (
                <div className={`flex gap-3 px-4 py-3.5 rounded-xl border text-[13px] ${
                  submitMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400'
                    : 'border-destructive/30 bg-destructive/8 text-destructive'
                }`}>
                  <span className={`mt-0.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full ${
                    submitMessage.type === 'success' ? 'bg-emerald-500/15' : 'bg-destructive/15'
                  }`}>
                    {submitMessage.type === 'success'
                      ? <IconCheck size={12} />
                      : <IconAlertTriangle size={12} />}
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

              {/* ── Submit button ── */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitBusy}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold bg-[var(--sibling-primary)] hover:opacity-90 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_-4px_var(--sibling-primary)]"
                >
                  {submitBusy ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Queueing call…
                    </>
                  ) : (
                    <>
                      <IconZap size={13} />
                      Drop the call
                    </>
                  )}
                </button>
                {!previewReady && (
                  <span className="text-[11px] text-muted-foreground/40">
                    Fill phone, name &amp; product to unlock
                  </span>
                )}
              </div>
            </div>

            {/* ════════════════════════════════
                RIGHT COLUMN  (40%) — sticky
            ════════════════════════════════ */}
            <div className="w-full lg:w-[40%] lg:sticky lg:top-4">
              <div className="rounded-2xl border border-[var(--glass-border)] overflow-hidden">

                {/* Panel header */}
                <div className="px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--sibling-primary)]/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)]">
                        <IconBot size={16} />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-foreground leading-none">Agent Instructions</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          Overrides — or let AI handle it
                        </p>
                      </div>
                    </div>
                    {/* Auto badge showing how many are set to AI */}
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sibling-primary)]/10 border border-[var(--sibling-primary)]/20 text-[11px] font-semibold text-[var(--sibling-primary)]">
                      <IconSparkles size={10} />
                      {autoCount}/5 auto
                    </span>
                  </div>

                  {/* "All AI" shortcut */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]/50">
                    <button
                      type="button"
                      onClick={() => {
                        setUseAiSystemPrompt(true);
                        setUseAiOpeningGreeting(true);
                        setUseAiAgentName(true);
                        setUseAiAgentRole(true);
                        setUseAiQuestions(true);
                      }}
                      className="text-[11px] text-[var(--sibling-primary)] hover:underline font-medium"
                    >
                      ✦ Let AI handle everything
                    </button>
                    <span className="text-muted-foreground/30 text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setUseAiSystemPrompt(false);
                        setUseAiOpeningGreeting(false);
                        setUseAiAgentName(false);
                        setUseAiAgentRole(false);
                        setUseAiQuestions(false);
                      }}
                      className="text-[11px] text-muted-foreground/60 hover:text-foreground hover:underline"
                    >
                      Override all manually
                    </button>
                  </div>
                </div>

                {/* Instruction rows */}
                <div className="p-5 space-y-5 divide-y divide-[var(--glass-border)]">

                  {/* System prompt */}
                  <div className="pt-0">
                    <InstructionRow
                      icon={<IconCpu size={12} />}
                      label="System prompt"
                      hint="Agent persona, goal, tone & constraints"
                      aiChecked={useAiSystemPrompt}
                      onAiChange={setUseAiSystemPrompt}
                    >
                      <textarea
                        id="cc-system-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={4}
                        className={`${inputCls} resize-y min-h-[96px] text-[12px]`}
                        placeholder="You are Aarav, a senior sales associate at {company}. Your goal is to…"
                      />
                    </InstructionRow>
                  </div>

                  {/* Opening greeting */}
                  <div className="pt-4">
                    <InstructionRow
                      icon={<IconMessageSquare size={12} />}
                      label="Opening greeting"
                      hint="First line the agent says when call connects"
                      aiChecked={useAiOpeningGreeting}
                      onAiChange={setUseAiOpeningGreeting}
                    >
                      <textarea
                        id="cc-greeting"
                        value={openingGreeting}
                        onChange={(e) => setOpeningGreeting(e.target.value)}
                        rows={2}
                        className={`${inputCls} resize-y min-h-[56px] text-[12px]`}
                        placeholder="Hi {name}, this is Aarav calling from {company}…"
                      />
                    </InstructionRow>
                  </div>

                  {/* Agent identity — name + role side by side */}
                  <div className="pt-4 grid grid-cols-2 gap-4">
                    <InstructionRow
                      icon={<IconUser />}
                      label="Agent name"
                      aiChecked={useAiAgentName}
                      onAiChange={setUseAiAgentName}
                    >
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className={`${inputCls} text-[12px]`}
                        placeholder="Aarav"
                      />
                    </InstructionRow>
                    <InstructionRow
                      icon={<IconZap size={12} />}
                      label="Agent role"
                      aiChecked={useAiAgentRole}
                      onAiChange={setUseAiAgentRole}
                    >
                      <input
                        type="text"
                        value={agentRole}
                        onChange={(e) => setAgentRole(e.target.value)}
                        className={`${inputCls} text-[12px]`}
                        placeholder="Warm and friendly sales associate"
                      />
                    </InstructionRow>
                  </div>

                  {/* Questions */}
                  <div className="pt-4">
                    <InstructionRow
                      icon={<IconHelpCircle size={12} />}
                      label="Questions to ask"
                      hint="Max 3 — one per line"
                      aiChecked={useAiQuestions}
                      onAiChange={setUseAiQuestions}
                    >
                      <textarea
                        id="cc-questions"
                        value={questionsToAsk}
                        onChange={(e) => setQuestionsToAsk(e.target.value)}
                        rows={4}
                        className={`${inputCls} resize-y min-h-[96px] text-[12px]`}
                        placeholder={"1) What are you currently using?\n2) What's your monthly budget?\n3) When do you want to start?"}
                      />
                      {!useAiQuestions && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground/50">
                          Only the first <span className="font-semibold text-foreground">3</span> non-empty lines are sent.
                        </p>
                      )}
                    </InstructionRow>
                  </div>

                </div>

                {/* Panel footer — voice model line */}
                <div className="px-5 py-3 border-t border-[var(--glass-border)] bg-[var(--glass-hover)]/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                    <IconMic size={11} />
                    <span>
                      {voiceMode === VOICE_MODE.luxury
                        ? 'eleven_v3'
                        : voiceMode === VOICE_MODE.quality
                          ? 'eleven_multilingual_v2'
                          : 'eleven_flash_v2_5'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                    <IconCpu size={11} />
                    <span className="capitalize">{llmProvider}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                    <span>{langLabel}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>{/* end split */}
        </form>
      )}
    </div>
  );
}
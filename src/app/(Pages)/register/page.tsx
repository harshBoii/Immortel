'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CmsChoice = 'Shopify' | 'WordPress' | 'Other';

type StepId = 'account' | 'company' | 'cms' | 'site' | 'launch';

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<StepId>('account');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');

  const [cmsChoice, setCmsChoice] = useState<CmsChoice>('Shopify');
  const [requestedCmsName, setRequestedCmsName] = useState('');

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [shopDomain, setShopDomain] = useState('');
  const [wordpressSiteUrl, setWordpressSiteUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const stepOrder: StepId[] = useMemo(
    () => ['account', 'company', 'cms', 'site', 'launch'],
    []
  );
  const stepIndex = stepOrder.indexOf(step);
  const progress = Math.max(0, stepIndex) / (stepOrder.length - 1);

  const stepMeta = useMemo(() => {
    const meta: Record<StepId, { title: string; subtitle: string }> = {
      account: {
        title: 'Let’s spin up your HQ',
        subtitle: 'Two inputs. Zero drama. We move.',
      },
      company: {
        title: 'Tell me who we’re building for',
        subtitle: 'Name + domain = your brand’s home base.',
      },
      cms: {
        title: 'What stack are we vibing with?',
        subtitle: 'Pick your CMS. If it’s “other”, just type it in.',
      },
      site: {
        title: 'Connect the dots',
        subtitle: 'Drop your website. If you’re using a store/CMS, add the domain too.',
      },
      launch: {
        title: 'Ready to start the setup?',
        subtitle: 'I’ll auto-build your company profile from your website.',
      },
    };
    return meta[step];
  }, [step]);

  function goNext() {
    setError(null);
    setSuccess(null);
    const next = stepOrder[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    setError(null);
    setSuccess(null);
    const prev = stepOrder[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function validateStep(current: StepId): string | null {
    if (current === 'account') {
      if (!email.trim()) return 'Email is required.';
      if (!password || password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (current === 'company') {
      if (!companyName.trim()) return 'Company name is required.';
      if (!companyDomain.trim()) return 'Company domain is required (e.g. example.com).';
    }
    if (current === 'cms') {
      if (cmsChoice === 'Other' && !requestedCmsName.trim()) return 'Tell us which CMS you want.';
    }
    if (current === 'site') {
      if (!websiteUrl.trim()) return 'Website URL is required.';
      if (cmsChoice === 'Shopify' && !shopDomain.trim()) return 'Shop domain is required for Shopify.';
      if (cmsChoice === 'WordPress' && !wordpressSiteUrl.trim())
        return 'Site URL is required for WordPress.';
    }
    return null;
  }

  async function handleContinue() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    goNext();
  }

  async function handleStartSetup() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          companyName,
          companyDomain,
          websiteUrl,
          cmsChoice,
          requestedCmsName: cmsChoice === 'Other' ? requestedCmsName : undefined,
          shopDomain: cmsChoice === 'Shopify' ? shopDomain : undefined,
          wordpressSiteUrl: cmsChoice === 'WordPress' ? wordpressSiteUrl : undefined,
        }),
      });

      const registerData = await registerRes.json().catch(() => ({}));
      if (!registerRes.ok || !registerData?.success) {
        setError(registerData?.error ?? 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      // Final step: same API as GEO auto-fill uses.
      const res = await fetch('/api/geo/auto-seed', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        const msg: string =
          data?.error ??
          (data?.missing
            ? 'Website URL is required before auto-filling.'
            : 'Failed to auto-fill company data.');
        setError(msg);
        setLoading(false);
        return;
      }

      setSuccess('Setup started. Your workspace is loading…');
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
      setError('Something went sideways. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const review = useMemo(() => {
    const cmsLabel =
      cmsChoice === 'Other' ? (requestedCmsName.trim() || 'Other') : cmsChoice;
    return [
      { k: 'Email', v: email.trim() || '—' },
      { k: 'Company', v: companyName.trim() || '—' },
      { k: 'Domain', v: companyDomain.trim() || '—' },
      { k: 'CMS', v: cmsLabel },
      { k: 'Website', v: websiteUrl.trim() || '—' },
      ...(cmsChoice === 'Shopify'
        ? [{ k: 'Shop domain', v: shopDomain.trim() || '—' }]
        : []),
      ...(cmsChoice === 'WordPress'
        ? [{ k: 'WP site', v: wordpressSiteUrl.trim() || '—' }]
        : []),
    ];
  }, [cmsChoice, requestedCmsName, email, companyName, companyDomain, websiteUrl, shopDomain, wordpressSiteUrl]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground">Immortell onboarding</div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {stepMeta.title}
            </h1>
            <p className="mt-1 text-muted-foreground">{stepMeta.subtitle}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Already in? Login →
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]/60 p-5 backdrop-blur-[var(--glass-blur)] backdrop-saturate-[var(--glass-saturate)] shadow-[var(--glass-shadow)]">
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
              Step {stepIndex + 1} / {stepOrder.length}
            </div>
            <div className="h-2 w-44 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-violet-500 to-blue-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
              {success}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            {step === 'account' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email" hint="Where we send the good stuff">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </Field>
                <Field label="Password" hint="8+ chars. Make it strong-ish.">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </Field>
              </div>
            ) : null}

            {step === 'company' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Company name" hint="What should we call you?">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Immortell"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </Field>
                <Field label="Company domain" hint="No https. Just the domain.">
                  <input
                    type="text"
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="immortell.com"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </Field>
              </div>
            ) : null}

            {step === 'cms' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="CMS / Store" hint="Pick one. No overthinking.">
                  <select
                    value={cmsChoice}
                    onChange={(e) => setCmsChoice(e.target.value as CmsChoice)}
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Shopify">Shopify</option>
                    <option value="WordPress">WordPress</option>
                    <option value="Other">Request other</option>
                  </select>
                </Field>
                {cmsChoice === 'Other' ? (
                  <Field label="Which CMS?" hint="Type it like you mean it.">
                    <input
                      type="text"
                      value={requestedCmsName}
                      onChange={(e) => setRequestedCmsName(e.target.value)}
                      placeholder="Webflow, Sanity, Contentful…"
                      className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                ) : (
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-sm text-muted-foreground flex items-center">
                    {cmsChoice === 'Shopify'
                      ? 'Nice. We can plug into Shopify quickly.'
                      : 'WordPress? Classic. Still goes hard.'}
                  </div>
                )}
              </div>
            ) : null}

            {step === 'site' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Website URL" hint="This powers the auto-setup.">
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://your-site.com"
                    className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </Field>
                {cmsChoice === 'Shopify' ? (
                  <Field label="Shop domain" hint="Usually *.myshopify.com">
                    <input
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="your-shop.myshopify.com"
                      className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                ) : null}
                {cmsChoice === 'WordPress' ? (
                  <Field label="WordPress site URL" hint="Where the WP lives.">
                    <input
                      type="text"
                      value={wordpressSiteUrl}
                      onChange={(e) => setWordpressSiteUrl(e.target.value)}
                      placeholder="https://blog.your-site.com"
                      className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </Field>
                ) : null}
                {cmsChoice === 'Other' ? (
                  <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-sm text-muted-foreground flex items-center md:col-span-1">
                    You’re requesting: <span className="ml-2 font-semibold text-foreground">{requestedCmsName.trim() || '—'}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 'launch' ? (
              <div className="grid gap-4">
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] p-4">
                  <div className="text-sm font-semibold">Quick review</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {review.map((row) => (
                      <div key={row.k} className="flex items-center justify-between gap-3 rounded-lg bg-background/40 px-3 py-2">
                        <div className="text-muted-foreground">{row.k}</div>
                        <div className="font-medium text-foreground truncate max-w-[60%] text-right">
                          {row.v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] p-4 text-sm text-muted-foreground">
                  When you hit <span className="font-semibold text-foreground">Start setup</span>, we’ll create your workspace,
                  save your website, and auto-fill your company profile from GEO.
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0 || loading}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              Back
            </button>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {step !== 'launch' ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-primary via-violet-500 to-blue-500 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-60"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-primary via-violet-500 to-blue-500 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-60"
                >
                  {loading ? 'Starting setup…' : 'Start setup'}
                </button>
              )}
              <Link href="/landing" className="text-center text-sm text-muted-foreground hover:underline">
                Back to landing
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to the Terms & Privacy Policy (we’ll keep it chill).
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {hint ? <span className="text-xs text-muted-foreground/80">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}


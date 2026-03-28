'use client';

import { memo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import {
  ArrowRight, BarChart3, Check, FileText, Film,
  Lock, LogIn, Play, Radio, Repeat2, Star, Target, Zap,
} from 'lucide-react';
import './style.css';

// ─── Easing ─────────────────────────────────────────────────────────────────
const easeOut  = [0.22, 1, 0.36, 1] as const;
const easeMist = [0.17, 0.99, 0.28, 1] as const;

// ─── Animation factory ───────────────────────────────────────────────────────
function mistSection(opts: {
  x?: number; y?: number; blur?: number; scale?: number;
  amount?: number; duration?: number; margin?: string;
} = {}) {
  const {
    x = 0, y = 32, blur = 12,  // ← reduced default blur (was 18) for GPU perf
    scale = 0.97,               // ← tighter scale range (was 0.96)
    amount = 0.12, duration = 0.95,
    margin = '0px 0px -12% 0px',
  } = opts;
  return {
    initial:     { opacity: 0, x, y, filter: `blur(${blur}px)`, scale },
    whileInView: { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', scale: 1 },
    viewport:    { once: true, amount, margin },
    transition:  { duration, ease: easeMist },
  };
}

// ─── Section variants (blur values trimmed ~40% — visually imperceptible) ────
const sectionMist = {
  problem:      mistSection({ x: -52, y: 0,  blur: 10, scale: 0.98, duration: 0.92 }),
  twoSides:     mistSection({ y: 48,  blur: 14, scale: 0.97, duration: 1.05, amount: 0.08 }),
  pillars:      mistSection({ y: 44,  blur: 12, scale: 0.97, duration: 0.9  }),
  testimonials: mistSection({ x: 48,  y: 0,  blur: 10, scale: 0.98, duration: 0.95 }),
  pricing:      mistSection({ x: -40, y: 24, blur: 10, scale: 0.97, duration: 0.92 }),
  finalCta:     mistSection({ y: 36,  blur: 14, scale: 0.94, duration: 1.08, amount: 0.15 }),
  footer:       mistSection({ y: 24,  blur: 8,  scale: 0.99, duration: 0.78, amount: 0.2  }),
};

const pillarCard = {
  hidden:  { opacity: 0, y: 44, filter: 'blur(10px)', scale: 0.97 },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)',  scale: 1,
    transition: { duration: 0.88, ease: easeMist } },
};
const priceCardMist = {
  hidden:  { opacity: 0, y: 36, filter: 'blur(8px)', scale: 0.97 },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', scale: 1,
    transition: { duration: 0.82, ease: easeMist } },
};
const testiCardMist = {
  hidden:  { opacity: 0, y: 40, filter: 'blur(10px)', scale: 0.97 },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)',  scale: 1,
    transition: { duration: 0.85, ease: easeMist } },
};
const heroParent = {
  initial: 'hidden', animate: 'visible',
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  },
};
const heroChild = {
  variants: {
    hidden:  { opacity: 0, y: 24, filter: 'blur(8px)' },
    visible: { opacity: 1, y: 0,  filter: 'blur(0px)',
      transition: { duration: 0.62, ease: easeMist } },
  },
};
const statStagger = {
  initial: 'hidden', whileInView: 'visible',
  viewport: { once: true, amount: 0.22, margin: '0px 0px -10% 0px' },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.14, delayChildren: 0.06 } },
  },
};
const statItem = {
  variants: {
    hidden:  { opacity: 0, y: 26, filter: 'blur(10px)', scale: 0.98 },
    visible: { opacity: 1, y: 0,  filter: 'blur(0px)',  scale: 1,
      transition: { duration: 0.78, ease: easeMist } },
  },
};
const gridStagger = {
  initial: 'hidden', whileInView: 'visible',
  viewport: { once: true, amount: 0.08 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
  },
};
const testiStagger = {
  initial: 'hidden', whileInView: 'visible',
  viewport: { once: true, amount: 0.08 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
  },
};
const priceStagger = {
  initial: 'hidden', whileInView: 'visible',
  viewport: { once: true, amount: 0.06 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
  },
};

// ─── Static data (module-level — no re-creation on render) ──────────────────
const RANK_FEATURES = [
  { Icon: Radio,    title: 'AI Radar',          desc: 'Maps competitor citations across 10+ AI engines in real time' },
  { Icon: Target,   title: 'Bounty List',        desc: 'Tells your team exactly what to create — no guesswork' },
  { Icon: FileText, title: 'AEO Vault',          desc: 'Publishes schema-rich, Direct-to-Answer pages built for LLM ingestion' },
  { Icon: Film,     title: 'Expert Extractor',   desc: 'Turns your existing webinars into 8× the citation-ready content' },
] as const;

const CONVERT_FEATURES = [
  { Icon: Play,     title: 'Simulated Live SDK', desc: 'One script tag. Interactive video widget on any AEO page.' },
  { Icon: BarChart3,title: 'Intent Scoring',     desc: 'Tracks video depth, pricing clicks, and time on page in real time' },
  { Icon: Zap,      title: 'Sales War Room',     desc: 'Rep gets live alert the moment intent crosses threshold' },
  { Icon: Repeat2,  title: 'Full Loop Attribution', desc: 'Revenue traced back to the exact AI citation that started the journey' },
] as const;

const PILLARS = [
  { cls: 'p-m', n: 'M', label: '01 · Manufacture', word: 'Manufacture',
    sub: 'AI Traffic, engineered',
    desc: 'AI Radar maps every citation gap. Bounty List tells your team what to build. AEO Vault publishes it in the format AI engines cite.',
    val: '3×', metric: 'citation velocity growth in first 60 days' },
  { cls: 'p-c', n: 'C', label: '02 · Capture', word: 'Capture',
    sub: 'The click, before the bounce',
    desc: 'SDK deploys in one script tag. Interactive video catches AI-referred visitors. War Room fires when intent is real.',
    val: '3×', metric: 'demo conversion vs. static landing pages' },
  { cls: 'p-r', n: 'R', label: '03 · Resurrect', word: 'Resurrect',
    sub: 'Dead content, earning again',
    desc: 'Expert Extractor pulls claims and data from your video library. One 60-min webinar becomes 8 AEO pages automatically.',
    val: '8×', metric: 'content output from existing video library' },
  { cls: 'p-o', n: 'O', label: '04 · Orchestrate', word: 'Orchestrate',
    sub: 'The pipeline, not the guesswork',
    desc: "Every brief is gap-driven. Citation Velocity shows what's working. Share-of-Answer tracks your % presence in AI answers.",
    val: '100%', metric: 'of content tied to a proven citation gap' },
] as const;

const TESTIMONIALS = [
  { quote: 'We went from zero AI citations to 47 in 60 days. Our Share-of-Answer in our category went from invisible to number one on Perplexity.',
    initials: 'SK', color: '#d4500a', name: 'Sarah Kim', role: 'VP Marketing, Acmecorp',
    metrics: [{ val: '47', label: 'New citations in 60 days' }, { val: '#1', label: 'Share of answer' }] },
  { quote: 'A buyer clicked our Perplexity citation, spent 4 minutes on our AEO page, hovered on pricing — and our rep was live with them within 30 seconds. That deal closed the same week.',
    initials: 'MR', color: '#6d28d9', name: 'Marcus Reid', role: 'CRO, Veritas',
    metrics: [{ val: '3×', label: 'Demo conversion rate' }, { val: '30s', label: 'War room response' }] },
  { quote: '18 months of webinar recordings doing nothing. Immortell turned them into 140 AEO pages in a week. Three are now the top citations for our category on ChatGPT.',
    initials: 'JL', color: '#047857', name: 'Jade Lee', role: 'Head of Content, Nexio',
    metrics: [{ val: '140', label: 'AEO pages created' }, { val: 'Top 3', label: 'ChatGPT citations' }] },
] as const;

const PRICING_PLANS = [
  { featured: false, tier: 'Entry', name: 'Citation',
    tagline: 'Manufacture AI traffic and take back the citations competitors own.',
    price: '$3k', period: 'per month · billed annually',
    feats: ['AI Radar — 5 categories monitored', 'Weekly Bounty List generation', 'AEO Vault — 20 pages / month', 'Citation Velocity dashboard', '1 video extraction / month'],
    btnClass: 'btn-dark', btnText: 'Start 90-day Pilot' },
  { featured: true, tier: 'Core', name: 'Convert',
    tagline: 'Rank in AI and convert that traffic into booked demos and pipeline.',
    price: '$6k', period: 'per month · billed annually',
    feats: ['Everything in Citation', 'Simulated Live SDK — unlimited pages', 'Intent scoring + Sales War Room', '5 video extractions / month', 'Share-of-Answer analytics', 'HubSpot + Salesforce integration'],
    btnClass: 'btn-ember', btnText: 'Book Demo' },
  { featured: false, tier: 'Platform', name: 'Dominate',
    tagline: 'The full AI Revenue Loop. Own your category in AI search.',
    price: '$15k', period: 'per month · billed annually',
    feats: ['Everything in Convert', 'Unlimited video extractions', 'Full GEO Content OS', 'Prompt Universe builder', 'RAG-ready content API', 'Dedicated GEO Strategist'],
    btnClass: 'btn-dark', btnText: 'Talk to Sales' },
] as const;

const FOOTER_LINKS = ['Product', 'Pricing', 'Blog', 'Careers', 'Contact'] as const;
const STARS = Array.from({ length: 5 });

// ─── Memoized card components (skip re-render if parent updates) ─────────────
const PillarCard = memo(function PillarCard({ p }: { p: typeof PILLARS[number] }) {
  return (
    <m.div className={`pillar ${p.cls}`} data-n={p.n} variants={pillarCard}>
      <div className="pillar-n">{p.label}</div>
      <div className="pillar-word">{p.word}</div>
      <div className="pillar-subtitle">{p.sub}</div>
      <p className="pillar-desc">{p.desc}</p>
      <div className="pillar-metric">
        <div className="pillar-metric-val">{p.val}</div>
        <div className="pillar-metric-text">{p.metric}</div>
      </div>
    </m.div>
  );
});

const TestiCard = memo(function TestiCard({ t }: { t: typeof TESTIMONIALS[number] }) {
  return (
    <m.div
      className="testi-card"
      variants={testiCardMist}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="testi-stars" aria-hidden>
        {STARS.map((_, i) => (
          <span className="testi-star" key={i}>
            <Star size={14} fill="currentColor" strokeWidth={0} />
          </span>
        ))}
      </div>
      <div className="testi-quote">&quot;{t.quote}&quot;</div>
      <div className="testi-author">
        <div className="testi-avatar" style={{ background: t.color }}>{t.initials}</div>
        <div>
          <div className="testi-name">{t.name}</div>
          <div className="testi-role">{t.role}</div>
        </div>
      </div>
      <div className="testi-metrics">
        {t.metrics.map((m) => (
          <div key={m.label}>
            <div className="testi-metric-val">{m.val}</div>
            <div className="testi-metric-label">{m.label}</div>
          </div>
        ))}
      </div>
    </m.div>
  );
});

const PriceCard = memo(function PriceCard({ plan }: { plan: typeof PRICING_PLANS[number] }) {
  return (
    <m.div
      className={`price-card${plan.featured ? ' featured' : ''}`}
      variants={priceCardMist}
    >
      {plan.featured && <div className="price-popular">Most Popular</div>}
      <div className="price-tier">{plan.tier}</div>
      <div className="price-name">{plan.name}</div>
      <div className="price-tagline">{plan.tagline}</div>
      <div className="price-val">{plan.price}</div>
      <div className="price-period">{plan.period}</div>
      <div className="price-divider" />
      <div className="price-feats">
        {plan.feats.map((f) => (
          <div className="price-feat" key={f}>
            <div className="price-check"><Check aria-hidden /></div>
            {f}
          </div>
        ))}
      </div>
      <Link href="#" className={`price-btn ${plan.btnClass}`}>
        {plan.btnText}
        <ArrowRight className="price-btn-arrow" size={15} strokeWidth={2.25} aria-hidden />
      </Link>
    </m.div>
  );
});

// ─── Main component ──────────────────────────────────────────────────────────
export default function ImmortelLanding() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const handleScroll = () => {
      nav.classList.toggle('landing-nav--scrolled', window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="landing-page">
      {/* NAV */}
      <m.nav
        ref={navRef}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <Link href="/" className="nav-logo">
          <div className="nav-mark">
            <Image
              src="/Immortel_Logo_Dark.png"
              alt="Immortell"
              fill
              className="nav-mark-img"
              sizes="68px"
              priority
            />
          </div>
          <div className="nav-name">Immortell</div>
        </Link>
        <div className="nav-right">
          <Link href="#pillars" className="nav-link">How it works</Link>
          <Link href="#results"  className="nav-link">Results</Link>
          <Link href="#pricing"  className="nav-link">Pricing</Link>
          <div className="nav-actions">
            <Link href="/login" className="nav-login">
              <LogIn size={14} strokeWidth={2.25} aria-hidden />
              Login
            </Link>
            <Link href="#" className="nav-cta">
              Get Citation Audit
              <ArrowRight className="nav-cta-icon" size={14} strokeWidth={2.25} aria-hidden />
            </Link>
          </div>
        </div>
      </m.nav>

      {/* HERO */}
      <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
        <div className="hero">
          <m.div className="hero-left" {...heroParent}>
            <m.div className="hero-eyebrow" {...heroChild}>
              <span className="eyebrow-badge">New</span>
              <span className="eyebrow-sep">·</span>
              <span className="eyebrow-tag">AI Revenue Loop for B2B SaaS</span>
            </m.div>
            <m.h1 className="hero-h1" {...heroChild}>
              The only platform that
              <span className="and-line">ranks you in AI search —</span>
              <span className="converts">and converts</span>
              the visitors it sends.
            </m.h1>
            <m.div className="hero-rule" {...heroChild} />
            <m.p className="hero-sub" {...heroChild}>
              Your competitors are being cited in Perplexity, ChatGPT, and Claude right now.
              Those visitors are landing — and{' '}
              <strong>leaving before your team sees them.</strong> Immortell fixes both ends
              of that problem. Simultaneously.
            </m.p>
            <m.div className="hero-actions" {...heroChild}>
              <Link href="#" className="btn-primary">
                See who&apos;s outranking you in AI search
                <span className="btn-arrow">→</span>
              </Link>
              <Link href="#" className="btn-ghost">
                <div className="btn-ghost-icon">
                  <Play size={12} fill="currentColor" aria-hidden />
                </div>
                Watch 3-min demo
              </Link>
            </m.div>
            <m.div className="hero-trust" {...heroChild}>
              Free audit · No credit card · Results in 10 minutes
            </m.div>
          </m.div>

          <m.div
            className="hero-right"
            initial={{ opacity: 0, x: 44, filter: 'blur(14px)', scale: 0.97 }}
            animate={{ opacity: 1, x: 0,  filter: 'blur(0px)',  scale: 1    }}
            transition={{ duration: 0.9, delay: 0.1, ease: easeMist }}
          >
            <div className="demo-panel">
              <div className="demo-bar">
                <div className="demo-dots">
                  <div className="demo-dot demo-dot-r" />
                  <div className="demo-dot demo-dot-y" />
                  <div className="demo-dot demo-dot-g" />
                </div>
                <div className="demo-url">
                  <span className="demo-url-lock"><Lock aria-hidden /></span>
                  perplexity.ai/search
                </div>
              </div>
              <div className="demo-body">
                <div className="ai-result">
                  <div className="ai-result-header">
                    <div className="ai-engine-badge badge-perplexity">Perplexity AI</div>
                    <div className="ai-result-query">&quot;best B2B pipeline acceleration tools&quot;</div>
                  </div>
                  <div className="ai-answer">
                    Based on current reviews and expert analysis, the leading platforms for B2B
                    pipeline acceleration include{' '}
                    <span className="ai-citation">Immortell [1]</span> for AI-native lead
                    conversion, alongside established players...
                  </div>
                </div>
                <div className="aeo-preview">
                  <div className="aeo-header">
                    <div className="aeo-logo">
                      <div className="aeo-logo-dot">I</div>
                      <div className="aeo-logo-name">Immortell</div>
                    </div>
                  </div>
                  <div className="aeo-body">
                    <div className="aeo-title">B2B Pipeline Acceleration: The Complete Guide</div>
                    <div className="aeo-text">
                      The fastest-growing B2B teams use AI citations to drive 87% of inbound
                      pipeline. Here&apos;s how the conversion loop works...
                    </div>
                    <div className="sdk-widget">
                      <div className="sdk-video-area">
                        <div className="sdk-live-badge">
                          <div className="sdk-live-dot" /> LIVE
                        </div>
                        <div className="sdk-play">
                          <Play size={12} fill="currentColor" aria-hidden />
                        </div>
                      </div>
                      <div className="sdk-bar">
                        <div className="sdk-name">Watch: How we 3x&apos;d our pipeline from AI traffic</div>
                        <div className="sdk-cta-btn">Book Demo</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="war-room">
                  <div className="war-icon"><Zap aria-hidden /></div>
                  <div>
                    <div className="war-text-title">Sales War Room — High Intent Detected</div>
                    <div className="war-text-sub">Visitor from Perplexity · Viewed pricing · 4m 22s on page</div>
                  </div>
                  <div className="war-join">Join Live →</div>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      </div>

      {/* STATS STRIP */}
      <m.div className="stats-strip" {...statStagger}>
        <m.div className="stat-cell" {...statItem}>
          <div className="stat-num">87%</div>
          <div className="stat-label">of B2B buyers now research via AI chat before contacting sales</div>
        </m.div>
        <m.div className="stat-cell" {...statItem}>
          <div className="stat-num">80%</div>
          <div className="stat-label">of AI-referred visitors bounce before touching any form or CTA</div>
        </m.div>
        <m.div className="stat-cell" {...statItem}>
          <div className="stat-num">0</div>
          <div className="stat-label">other platforms solve both the ranking and the conversion. Until now.</div>
        </m.div>
      </m.div>

      {/* PROBLEM */}
      <m.div className="problem-section" {...sectionMist.problem}>
        <div className="problem-left">
          <div className="problem-eyebrow">The Problem</div>
          <h2 className="problem-title">
            Your stack was built for Google.<br /><em>Buyers moved on.</em>
          </h2>
          <p className="problem-desc">
            Every tool in your marketing stack was designed for a world where Google sent you
            traffic. That world is ending. Three things are breaking right now — simultaneously.
          </p>
        </div>
        <div className="problem-items">
          <div className="problem-item">
            <div className="problem-num">01</div>
            <div>
              <div className="problem-item-title">You&apos;re invisible in AI search</div>
              <div className="problem-item-desc">
                Your buyers ask Perplexity, ChatGPT, and Claude about your category every day.
                Someone else is the Primary Citation. GA4 calls it &quot;direct traffic.&quot; You
                can&apos;t see what you&apos;re losing — so you can&apos;t fix it.
              </div>
              <div className="problem-item-stat">87% of B2B buyers use AI to research before calling sales</div>
            </div>
          </div>
          <div className="problem-item">
            <div className="problem-num">02</div>
            <div>
              <div className="problem-item-title">AI-referred visitors bounce before your team sees them</div>
              <div className="problem-item-desc">
                These are your warmest leads — they clicked a citation about exactly what you solve.
                But they land on a static page with a Calendly link, feel nothing, and leave in 8
                seconds. Your form never even loaded.
              </div>
              <div className="problem-item-stat">80% bounce rate on AI-referred traffic across B2B SaaS</div>
            </div>
          </div>
          <div className="problem-item">
            <div className="problem-num">03</div>
            <div>
              <div className="problem-item-title">Your best content dies in 72 hours</div>
              <div className="problem-item-desc">
                You spent $40k on a webinar series. It&apos;s sitting in Zoom. It contains expert
                insights, founder claims, and proprietary data that AI engines would cite for years
                — if someone extracted it. Nobody has.
              </div>
              <div className="problem-item-stat">60% of B2B content has zero measurable pipeline impact</div>
            </div>
          </div>
        </div>
      </m.div>

      {/* TWO SIDES */}
      <div className="two-sides">
        <m.div className="two-sides-inner" {...sectionMist.twoSides}>
          <div className="two-sides-header">
            <div className="two-sides-eyebrow">The Solution</div>
            <h2 className="two-sides-title">
              Rank in AI. Convert what arrives.<br /><em>Both. At once.</em>
            </h2>
          </div>
          <div className="two-col">
            <div className="side-col side-rank">
              <div className="side-label">
                <div className="side-label-dot" /> Side One · Rank
              </div>
              <div className="side-title">Manufacture your AI citations</div>
              <div className="side-desc">
                Immortell&apos;s AI Radar scrapes Perplexity, ChatGPT, Claude, and Gemini to find
                every citation gap in your category. Then it builds the exact content to take those
                positions back — not SEO guesswork, manufactured distribution.
              </div>
              <div className="side-features">
                {RANK_FEATURES.map((f) => (
                  <div className="side-feature" key={f.title}>
                    <div className="side-feature-icon" aria-hidden>
                      <f.Icon size={16} strokeWidth={2} />
                    </div>
                    <div><strong>{f.title}</strong>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="two-col-sep">
              <div className="sep-line" />
              <div className="sep-word">simultaneously</div>
              <div className="sep-line" />
            </div>
            <div className="side-col side-convert">
              <div className="side-label">
                <div className="side-label-dot" /> Side Two · Convert
              </div>
              <div className="side-title">Capture the click before it bounces</div>
              <div className="side-desc">
                AI-referred visitors are your warmest leads — and they&apos;re leaving before your
                team ever sees them. The Immortell SDK catches them with an interactive video
                experience the moment they land, turning curiosity into booked demos.
              </div>
              <div className="side-features">
                {CONVERT_FEATURES.map((f) => (
                  <div className="side-feature" key={f.title}>
                    <div className="side-feature-icon" aria-hidden>
                      <f.Icon size={16} strokeWidth={2} />
                    </div>
                    <div><strong>{f.title}</strong>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </m.div>
      </div>

      {/* FOUR PILLARS */}
      <m.div className="pillars-section" id="pillars" {...sectionMist.pillars}>
        <div className="pillars-header">
          <div>
            <div className="problem-eyebrow">The Four Pillars</div>
            <h2 className="pillars-title">
              Manufacture. Capture.<br /><em>Resurrect. Orchestrate.</em>
            </h2>
          </div>
          <p className="pillars-body">
            Four capabilities, one closed loop. Each pillar feeds the next — and the data from
            every closed deal makes the next citation smarter.
          </p>
        </div>
        <m.div className="pillars-grid" {...gridStagger}>
          {PILLARS.map((p) => <PillarCard key={p.n} p={p} />)}
        </m.div>
      </m.div>

      {/* TESTIMONIALS */}
      <m.div className="testimonials" id="results" {...sectionMist.testimonials}>
        <div className="testimonials-inner">
          <div className="testimonials-header">
            <h2 className="testimonials-title">
              What happens when<br />the loop <em>closes.</em>
            </h2>
            <div className="testimonials-sub">
              From first citation to closed deal — what customers actually experience.
            </div>
          </div>
          <m.div className="testi-grid" {...testiStagger}>
            {TESTIMONIALS.map((t) => <TestiCard key={t.initials} t={t} />)}
          </m.div>
        </div>
      </m.div>

      {/* PRICING */}
      <m.div className="pricing-section" id="pricing" {...sectionMist.pricing}>
        <div className="pricing-header">
          <div className="pricing-eyebrow">Pricing</div>
          <h2 className="pricing-title">Start sharp.<br /><em>Scale the loop.</em></h2>
          <p className="pricing-sub">
            Every plan starts with a 90-day pilot. First citation movement guaranteed in 30 days —
            or we extend free.
          </p>
        </div>
        <m.div className="pricing-grid" {...priceStagger}>
          {PRICING_PLANS.map((plan) => <PriceCard key={plan.name} plan={plan} />)}
        </m.div>
      </m.div>

      {/* FINAL CTA */}
      <m.div className="final-cta" {...sectionMist.finalCta}>
        <div className="final-cta-eyebrow">Get Started Today</div>
        <h2 className="final-cta-title">
          See exactly who&apos;s getting cited<br />
          in your category — <em>right now.</em>
        </h2>
        <p className="final-cta-sub">
          We run your category through AI Radar and hand you a Gap Report showing every citation
          your competitors own. Free. No pitch. Just the data — in 10 minutes.
        </p>
        <div className="final-cta-actions">
          <Link href="#" className="btn-primary">
            Get Your Free Citation Audit
            <span className="btn-arrow">→</span>
          </Link>
          <Link href="#" className="btn-ghost">
            <div className="btn-ghost-icon">
              <Play size={12} fill="currentColor" aria-hidden />
            </div>
            Watch 3-min demo
          </Link>
        </div>
        <div className="final-cta-note">No credit card · No commitment · Results in 10 minutes</div>
      </m.div>

      {/* FOOTER */}
      <m.footer {...sectionMist.footer}>
        <div className="footer-top">
          <div>
            <div className="footer-logo">
              <div className="footer-logo-mark">I</div>
              <div className="footer-logo-name">Immortell</div>
            </div>
            <div className="footer-tagline">Rank in AI Search. Convert What It Sends.</div>
          </div>
          <div className="footer-links">
            {FOOTER_LINKS.map((l) => (
              <Link href="#" className="footer-link" key={l}>{l}</Link>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 Immortell. All rights reserved.</div>
          <div className="footer-pillars">Manufacture · Capture · Resurrect · Orchestrate</div>
        </div>
      </m.footer>
      </div>
    </LazyMotion>
  );
}
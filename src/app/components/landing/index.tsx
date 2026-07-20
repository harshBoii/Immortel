'use client';

import { Barlow, Barlow_Condensed, Space_Mono } from 'next/font/google';
import Link from 'next/link';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { memo, useEffect, useRef } from 'react';
import {
  HiCheckCircle,
  HiCreditCard,
  HiCalendarDays,
  HiMagnifyingGlass,
  HiSignal,
  HiShoppingBag,
} from 'react-icons/hi2';
import { ADD_ON_OPTIONS, getLandingPlanCards } from '@/lib/subscription/plans';
import './ac-landing.css';

const LANDING_PLANS = getLandingPlanCards();
const CHEAPEST_ADD_ON_PRICE = Math.min(
  ...ADD_ON_OPTIONS.map((a) => a.priceAmount)
);

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-imm-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-imm-barlow-cond',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-imm-space-mono',
  display: 'swap',
});

const easeOut = [0.22, 1, 0.36, 1] as const;
const easeMist = [0.17, 0.99, 0.28, 1] as const;

function mistSection(opts: {
  x?: number;
  y?: number;
  blur?: number;
  scale?: number;
  amount?: number;
  duration?: number;
  margin?: string;
} = {}) {
  const {
    x = 0,
    y = 32,
    blur = 12,
    scale = 0.97,
    amount = 0.12,
    duration = 0.95,
    margin = '0px 0px -12% 0px',
  } = opts;
  return {
    initial: { opacity: 0, x, y, filter: `blur(${blur}px)`, scale },
    whileInView: { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', scale: 1 },
    viewport: { once: true, amount, margin },
    transition: { duration, ease: easeMist },
  };
}

const sectionMist = {
  problem: mistSection({ x: -52, y: 0, blur: 10, scale: 0.98, duration: 0.92 }),
  framework: mistSection({ y: 44, blur: 12, scale: 0.97, duration: 0.9 }),
  protocol: mistSection({ y: 40, blur: 12, scale: 0.97, duration: 0.94 }),
  checkout: mistSection({ y: 48, blur: 14, scale: 0.97, duration: 1.05, amount: 0.08 }),
  audience: mistSection({ y: 36, blur: 10, scale: 0.98, duration: 0.88 }),
  proof: mistSection({ x: 48, y: 0, blur: 10, scale: 0.98, duration: 0.95 }),
  pricing: mistSection({ x: -40, y: 24, blur: 10, scale: 0.97, duration: 0.92 }),
  finalCta: mistSection({ y: 36, blur: 14, scale: 0.94, duration: 1.08, amount: 0.15 }),
  footer: mistSection({ y: 24, blur: 8, scale: 0.99, duration: 0.78, amount: 0.2 }),
};

const rwCard = {
  hidden: { opacity: 0, y: 44, filter: 'blur(10px)', scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.88, ease: easeMist },
  },
};

const priceCardMist = {
  hidden: { opacity: 0, y: 36, filter: 'blur(8px)', scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.82, ease: easeMist },
  },
};

const proofCardMist = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)', scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: { duration: 0.85, ease: easeMist },
  },
};

const heroParent = {
  initial: 'hidden' as const,
  animate: 'visible' as const,
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  },
};

const heroChild = {
  variants: {
    hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.62, ease: easeMist },
    },
  },
};

const statStagger = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.22, margin: '0px 0px -10% 0px' },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.14, delayChildren: 0.06 } },
  },
};

const statItem = {
  variants: {
    hidden: { opacity: 0, y: 26, filter: 'blur(10px)', scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 0.78, ease: easeMist },
    },
  },
};

const rwGridStagger = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.08 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.13, delayChildren: 0.08 } },
  },
};

const protoStagger = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.1 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
  },
};

const protoRowVar = {
  variants: {
    hidden: { opacity: 0, x: -28, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.72, ease: easeMist },
    },
  },
};

const flowStagger = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.06 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
  },
};

const flowStepMotion = {
  variants: {
    hidden: { opacity: 0, y: 32, filter: 'blur(10px)', scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: { duration: 0.75, ease: easeMist },
    },
  },
};

function audPanelMotion(delay = 0) {
  return {
    initial: { opacity: 0, y: 40, filter: 'blur(12px)', scale: 0.98 },
    whileInView: { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.85, ease: easeMist, delay },
  };
}

const flowConnVar = {
  variants: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.35, ease: easeMist } },
  },
};

const proofStagger = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.08 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
  },
};

const priceStagger = {
  initial: 'hidden' as const,
  whileInView: 'visible' as const,
  viewport: { once: true, amount: 0.06 },
  variants: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
  },
};

// ─── CHANGED: AEO-native ticker labels ───────────────────────────────────────
const TICKER_LABELS = [
  'Read · Write · Rank',
  'Citation Velocity',
  'Prompt Universe Mapping',
  'Answer Engine Coverage',
  'AEO Schema Layer',
  'Bounty Lists',
  'One-Click Publish',
  'Knowledge Graph',
] as const;

// ─── CHANGED: AEO-native marquee phrases ─────────────────────────────────────
const MARQUEE_PHRASES = [
  'Answer Engine Optimization',
  'Be Cited First',
  'Own the AI Answer',
  'Dominate Every Engine',
  'Inside the AI Response',
] as const;

// ─── CHANGED: AEO-focused proof testimonials ─────────────────────────────────
const PROOF = [
  {
    result: '+340%',
    label: 'AI-attributed inbound leads in 90 days',
    quote:
      '"Within 6 weeks of deploying the AEO Vault, we were the #1 cited brand in our category on Perplexity. The quality of inbound completely changed — prospects arrived already sold."',
    initials: 'PN',
    name: 'Priya Nair',
    role: 'VP Marketing, Series B SaaS',
  },
  {
    result: '84%',
    label: 'Of demo requests now arrive AI-referred',
    quote:
      '"A prospect told us they asked ChatGPT who the best option was for their use case — and we were the only name it gave. They booked a call the same day. Immortell made that happen."',
    initials: 'JL',
    name: 'James Liu',
    role: 'VP Sales, DTC Brand',
  },
  {
    result: '2×',
    label: 'Conversion rate vs. traditional search traffic',
    quote:
      '"AI-referred visitors convert at double our Google rate because they arrive post-decision. Immortell\'s AEO layer means our content is the one the engines trust and cite."',
    initials: 'ST',
    name: 'Sofia Torres',
    role: 'CMO, Consumer Brand',
  },
] as const;

const PricingCard = memo(function PricingCard({
  tier,
  amount,
  per,
  featured,
  feats,
  cta,
  href,
}: {
  tier: string;
  amount: React.ReactNode;
  per: string;
  featured?: boolean;
  feats: readonly string[];
  cta: string;
  href: string;
}) {
  return (
    <m.div
      className={`price-card${featured ? ' featured' : ''}`}
      variants={priceCardMist}
    >
      <div className="price-tier">{tier}</div>
      <div className="price-amount">{amount}</div>
      <div className="price-per">{per}</div>
      <ul className="price-features">
        {feats.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <Link href={href} className="price-cta">
        {cta}
      </Link>
    </m.div>
  );
});

export default function ImmortelLanding() {
  const navRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mx = useRef(0);
  const my = useRef(0);
  const rx = useRef(0);
  const ry = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('nav-scrolled', window.scrollY > 80);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX;
      my.current = e.clientY;
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    };

    const tick = () => {
      rx.current += (mx.current - rx.current) * 0.12;
      ry.current += (my.current - ry.current) * 0.12;
      ring.style.left = `${rx.current}px`;
      ring.style.top = `${ry.current}px`;
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tickerDup = [...TICKER_LABELS, ...TICKER_LABELS];
  const marqueeDup = [...MARQUEE_PHRASES, ...MARQUEE_PHRASES, ...MARQUEE_PHRASES, ...MARQUEE_PHRASES];

  const fontClass = `${barlow.variable} ${barlowCondensed.variable} ${spaceMono.variable}`;
  const calendlyHref = "https://calendly.com/clipfoxcredentials/30min";

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={`landing-page ${fontClass}`}>
        <div ref={cursorRef} className="cursor" aria-hidden />
        <div ref={ringRef} className="cursor-ring" aria-hidden />

        <m.nav
          ref={navRef}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut }}
        >
          <Link href="/" className="nav-logo">
            Imm<span>◉</span>rtell
          </Link>
          <div className="nav-links">
            <Link href="#framework" className="nav-link">
              Platform
            </Link>
            <Link href="#protocol" className="nav-link">
              Protocol
            </Link>
            <Link href="#audience" className="nav-link">
              Solutions
            </Link>
            <Link href="#pricing" className="nav-link">
              Pricing
            </Link>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="nav-login">
              Login
            </Link>
            <Link href="/register" className="nav-cta">
              Get Access
            </Link>
          </div>
        </m.nav>

        <section id="hero">
          <div className="hero-bg" />
          <div className="hero-field" />

          {/* ─── CHANGED: AEO hero slice text ─── */}
          <m.div
            className="hero-slice"
            initial={{ opacity: 0, x: 56, filter: 'blur(14px)', scale: 0.97 }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: easeMist }}
            aria-hidden
          >
            <div className="hero-slice-inner">
              <div className="hero-slice-text">
                ANSWER&nbsp;ENGINE&nbsp;OPTIMIZATION&nbsp;&nbsp;ANSWER&nbsp;ENGINE&nbsp;OPTIMIZATION&nbsp;&nbsp;ANSWER&nbsp;ENGINE&nbsp;OPTIMIZATION&nbsp;&nbsp;
              </div>
            </div>
          </m.div>

          {/* ─── CHANGED: AEO hero content ─── */}
          <m.div className="hero-content" {...heroParent}>
            <m.div className="hero-eyebrow" {...heroChild}>
              Answer Engine Optimization Platform
            </m.div>
            <m.h1 className="hero-h1" {...heroChild}>
              The future
              <br />
              of search
              <br />
              <em>is being</em>
              <br />
              <span className="accent-line">answered.</span>
            </m.h1>
            <m.p className="hero-sub" {...heroChild}>
              From prompt to citation — inside the AI answer. Immortell turns AI queries into
              brand citations, traffic, and authority for your business.
            </m.p>
            <m.div className="hero-actions" {...heroChild}>
              <Link href="/register" className="btn-hero-main">
                Get Started
              </Link>
              <a
                href={calendlyHref}
                className="btn-hero-demo"
                target="_blank"
                rel="noreferrer noopener"
              >
                <HiCalendarDays aria-hidden />
                <span>Book. A. Demo With us</span>
              </a>
            </m.div>
          </m.div>

          <div className="hero-ticker">
            <div className="ticker-track">
              {tickerDup.map((label, i) => (
                <div className="ticker-item" key={`${label}-${i}`}>
                  <span className="ticker-dot" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="marquee-strip">
          <div className="marquee-track">
            {marqueeDup.map((phrase, i) => (
              <div className="marquee-item" key={`${phrase}-${i}`}>
                {phrase} <span />
              </div>
            ))}
          </div>
        </div>

        {/* ─── CHANGED: Problem section — AEO framing ─── */}
        <section id="problem">
          <m.div className="problem-left" {...sectionMist.problem}>
            <div className="problem-label">The Shift</div>
            <h2 className="problem-h2">
              AI is the new
              <br />
              <strong>search engine.</strong>
              <br />
              Are you in it?
            </h2>
            <p className="problem-body">
              800 million weekly queries across Perplexity, ChatGPT, and Gemini. Your
              competitors are being cited as the authoritative answer. Their brands are being
              recommended. The intent is there — the question is whether your content earns the
              citation or your rival does.
            </p>
          </m.div>
          <m.div className="problem-right" {...statStagger}>
            <m.div className="stat-block" {...statItem}>
              <div className="stat-n">800M</div>
              <div className="stat-l">Weekly AI queries across all major engines</div>
            </m.div>
            <m.div className="stat-block" {...statItem}>
              <div className="stat-n">60%+</div>
              <div className="stat-l">Of searches now answered by AI with zero clicks</div>
            </m.div>
            <m.div className="stat-block" {...statItem}>
              <div className="stat-n">527%</div>
              <div className="stat-l">YoY growth in AI-attributed site traffic</div>
            </m.div>
            <m.div className="stat-block" {...statItem}>
              <div className="stat-n">94%</div>
              <div className="stat-l">Of CMOs increasing GEO/AEO budget in 2026</div>
            </m.div>
          </m.div>
        </section>

        {/* ─── CHANGED: Framework section — Read / Write / Rank ─── */}
        <section id="framework">
          <div className="framework-bg-text">RWR</div>
          <m.div className="framework-header" {...sectionMist.framework}>
            <div className="framework-label">The Platform</div>
            <h2 className="framework-h2">
              Read. Write.
              <br />
              <span>Rank.</span>
            </h2>
          </m.div>
          <m.div className="rw-grid" {...rwGridStagger}>
            <m.div className="rw-card" variants={rwCard}>
              <div className="rw-num">01</div>
              <div className="rw-stage">Read</div>
              <div className="rw-sub">Radar Mapping &amp; Prompt Intel</div>
              <p className="rw-desc">
                We map exactly how every major AI engine sees your brand and your competitors.
                Find the citation gaps before they cost you authority.
              </p>
              <ul className="rw-bullets">
                <li>AI engine citation tracking across ChatGPT, Perplexity, Gemini</li>
                <li>Bounty Lists — prompts where competitors rank, you don&apos;t</li>
                <li>Citation velocity score vs. category benchmarks</li>
                <li>Real-time prompt universe monitoring (1,000+ queries/day)</li>
              </ul>
            </m.div>
            <m.div className="rw-card" variants={rwCard}>
              <div className="rw-num">02</div>
              <div className="rw-stage">Write</div>
              <div className="rw-sub">AEO Content Vault</div>
              <p className="rw-desc">
                Automatically generate AEO-optimised pages and Structured Knowledge Graphs
                grounded in your brand&apos;s truth — not hallucinations.
              </p>
              <ul className="rw-bullets">
                <li>AEO page generation targeting Bounty List prompts</li>
                <li>Structured Knowledge Graph built from your brand content</li>
                <li>Answer Assertion Layer — machine-readable brand fact schemas</li>
                <li>One-click publish to all answer engines simultaneously</li>
              </ul>
            </m.div>
            <m.div className="rw-card" variants={rwCard}>
              <div className="rw-num">03</div>
              <div className="rw-stage">Rank</div>
              <div className="rw-sub">Citation Authority Engine</div>
              <p className="rw-desc">
                The moat. Don&apos;t just get found — get cited first. Sustained citation
                authority inside every major AI answer engine, with data loops that compound
                your lead over time.
              </p>
              <ul className="rw-bullets">
                <li>Top-of-answer citation positioning in ChatGPT, Perplexity, Gemini</li>
                <li>Answer Graph reinforcement via structured entity signals</li>
                <li>Real-time citation rank tracking per prompt</li>
                <li>Citation data loops back to strengthen the AEO Vault</li>
              </ul>
            </m.div>
          </m.div>
        </section>

        {/* ─── CHANGED: Protocol section — AEO protocols ─── */}
        <section id="protocol">
          <m.div className="protocol-header" {...sectionMist.protocol}>
            <div className="protocol-label">The Protocol Layer</div>
            <h2 className="protocol-h2">
              One integration.
              <br />
              <em>Every AI engine.</em>
            </h2>
          </m.div>
          <div className="protocol-grid">
            <m.div className="protocol-stack" {...protoStagger}>
              <m.div className="proto-row" {...protoRowVar}>
                <div className="proto-tag">AES</div>
                <div className="proto-body">
                  <div className="proto-name">Answer Engine Schema</div>
                  <div className="proto-desc">
                    Translates your brand content into machine-readable structured facts that
                    Gemini, Perplexity, and ChatGPT can parse, trust, and cite. Your knowledge,
                    formatted for the world&apos;s most-used AI engines.
                  </div>
                </div>
              </m.div>
              <m.div className="proto-row" {...protoRowVar}>
                <div className="proto-tag">CAP</div>
                <div className="proto-body">
                  <div className="proto-name">Citation Authority Protocol</div>
                  <div className="proto-desc">
                    The trust-signal standard. Continuously pushes authoritative brand signals
                    and entity assertions to AI answer systems — so your brand is always the
                    most-credible source in your category.
                  </div>
                </div>
              </m.div>
              <m.div className="proto-row" {...protoRowVar}>
                <div className="proto-tag">AGP</div>
                <div className="proto-body">
                  <div className="proto-name">Answer Graph Protocol</div>
                  <div className="proto-desc">
                    The Semantic Layer. Builds a structured entity graph linking your brand,
                    products, claims, and use cases — so AI engines can reason about you with
                    confidence and cite you with precision.
                  </div>
                </div>
              </m.div>
              <m.div className="proto-row proto-mw" {...protoRowVar}>
                <div className="proto-body">
                  <div className="proto-name ac-muted">Immortell is the Unified Middleware</div>
                  <div className="proto-desc">
                    You connect once via our platform. We handle all three protocol
                    translations, keep your knowledge graph in sync, and route authority signals
                    through the right standard per AI engine.
                  </div>
                </div>
              </m.div>
            </m.div>

            {/* ─── CHANGED: Code block — AEO Schema v1 ─── */}
            <m.div
              className="protocol-right"
              initial={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.85, ease: easeMist, delay: 0.08 }}
            >
              <div className="cal-box">
                <span className="cal-comment">// Answer Engine Schema — AES v1</span>
                <br />
                {'{'}
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;@context&quot;</span>:{' '}
                <span className="cal-str">&quot;immortell:aeo/v1&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;assertionType&quot;</span>:{' '}
                <span className="cal-str">&quot;brand_authority_entity&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;entity_id&quot;</span>:{' '}
                <span className="cal-str">&quot;BRAND-ENT-4421&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;citation_signal&quot;</span>: {'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-key">&quot;authority_score&quot;</span>:{' '}
                <span className="cal-num">94</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-key">&quot;category&quot;</span>:{' '}
                <span className="cal-str">&quot;project-management-software&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-key">&quot;ttl_seconds&quot;</span>:{' '}
                <span className="cal-num">86400</span>
                <br />
                &nbsp;&nbsp;{'}'},
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;answer_coverage&quot;</span>:{' '}
                <span className="cal-str">&quot;top_citation&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;publish_endpoint&quot;</span>:{' '}
                <span className="cal-str">&quot;aes://immortell/publish/4421&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;engine_scope&quot;</span>: [
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-str">&quot;perplexity&quot;</span>,{' '}
                <span className="cal-str">&quot;chatgpt&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-str">&quot;gemini&quot;</span>
                <br />
                &nbsp;&nbsp;],
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;brand_id&quot;</span>:{' '}
                <span className="cal-str">&quot;immortell:brand-8821&quot;</span>
                <br />
                {'}'}
                <span className="cal-cursor" />
              </div>
            </m.div>
          </div>
        </section>

        {/* ─── CHANGED: "Checkout" → "Citation Loop" section ─── */}
        <section id="checkout">
          <div className="checkout-bg-text">AEO</div>
          <m.div className="checkout-header" {...sectionMist.checkout}>
            <div className="checkout-label">The Citation Loop</div>
            <h2 className="checkout-h2">
              From AI query to
              <br />
              <strong>top citation.</strong>
              <br />
              Every engine.
            </h2>
          </m.div>
          <m.div className="flow-steps" {...flowStagger}>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiMagnifyingGlass />
              </div>
              <div className="flow-title">User Queries AI</div>
              <p className="flow-desc">
                &quot;Best project management tool for remote teams&quot; — high-intent, ready to decide.
              </p>
              <div className="flow-badge">Perplexity · ChatGPT · Gemini</div>
            </m.div>
            <m.div className="flow-connector" aria-hidden {...flowConnVar}>
              →
            </m.div>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiSignal />
              </div>
              <div className="flow-title">Vault Fires AES</div>
              <p className="flow-desc">
                Your AEO page is matched. Answer Engine Schema signals brand authority and
                entity relevance.
              </p>
              <div className="flow-badge">AES Assertion</div>
            </m.div>
            <m.div className="flow-connector" aria-hidden {...flowConnVar}>
              →
            </m.div>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiCheckCircle />
              </div>
              <div className="flow-title">Engine Validates</div>
              <p className="flow-desc">
                Freshness check, entity confidence score, authority signal scope verified
                against query intent.
              </p>
              <div className="flow-badge">CAP Trust Layer</div>
            </m.div>
            <m.div className="flow-connector" aria-hidden {...flowConnVar}>
              →
            </m.div>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiCreditCard />
              </div>
              <div className="flow-title">Citation Ranked</div>
              <p className="flow-desc">
                Your brand is placed as the top-cited source in the AI answer. Position locked
                for the prompt category.
              </p>
              <div className="flow-badge">AGP / Answer Graph</div>
            </m.div>
            <m.div className="flow-connector" aria-hidden {...flowConnVar}>
              →
            </m.div>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiShoppingBag />
              </div>
              <div className="flow-title">Authority Compounds</div>
              <p className="flow-desc">
                Citation data loops back to the AEO Vault — your ranking strengthens with
                every engine interaction.
              </p>
              <div className="flow-badge">Continuous Loop</div>
            </m.div>
          </m.div>
        </section>

        {/* ─── CHANGED: Audience section — AEO role positioning ─── */}
        <m.section id="audience" {...sectionMist.audience}>
          <m.div className="aud-panel" {...audPanelMotion()}>
            <div className="aud-bg-num">01</div>
            <div>
              <div className="aud-role">For CMOs</div>
              <h3 className="aud-h3">
                One button.
                <br />
                Every AI
                <br />
                engine.
              </h3>
              <p className="aud-body aud-1">
                Stop briefing three agencies for three platforms. Hit publish and Immortell deploys
                your brand&apos;s authority to every answer engine simultaneously.
              </p>
              <ul className="aud-features aud-1">
                <li>Bounty List gap reports, weekly</li>
                <li>Citation velocity vs. competitors</li>
                <li>One-click AEO page deployment</li>
                <li>AI attribution in your existing dashboards</li>
              </ul>
            </div>
            <Link href="#cta" className="aud-cta">
              See CMO features →
            </Link>
          </m.div>

          <m.div className="aud-panel" {...audPanelMotion(0.06)}>
            <div className="aud-bg-num">02</div>
            <div>
              <div className="aud-role">For Content Strategists</div>
              <h3 className="aud-h3">
                Your content
                <br />
                inside every
                <br />
                AI answer.
              </h3>
              <p className="aud-body aud-2">
                Connect in 5 minutes. Your content gets structured, indexed, and cited inside
                every major AI interface — no engineers, no guesswork, no waiting.
              </p>
              <ul className="aud-features aud-2">
                <li>CMS &amp; blog native integration</li>
                <li>Automatic content-to-AEO-schema mapping</li>
                <li>Prompt-level citation rank tracking</li>
                <li>Traffic attribution per AI engine</li>
              </ul>
            </div>
            <Link href="#cta" className="aud-cta">
              See strategist features →
            </Link>
          </m.div>

          <m.div className="aud-panel" {...audPanelMotion(0.12)}>
            <div className="aud-bg-num">03</div>
            <div>
              <div className="aud-role">For CTOs</div>
              <h3 className="aud-h3">
                The protocol
                <br />
                stack your
                <br />
                team skips.
              </h3>
              <p className="aud-body aud-3">
                AES, CAP, AGP — three emerging AEO standards, 18 months of engineering, or
                one Immortell API call. We maintain the integrations as standards evolve.
              </p>
              <ul className="aud-features aud-3">
                <li>REST API + Webhook architecture</li>
                <li>AES · CAP · AGP protocol coverage</li>
                <li>Answer Engine Schema (AES) spec</li>
                <li>SSO, audit logs, GDPR compliance</li>
              </ul>
            </div>
            <Link href="#cta" className="aud-cta">
              See API docs →
            </Link>
          </m.div>
        </m.section>

        <m.section id="proof" {...sectionMist.proof}>
          <div className="proof-label">Early Results</div>
          <m.div className="proof-grid" {...proofStagger}>
            {PROOF.map((p) => (
              <m.div
                key={p.initials}
                className="proof-card"
                variants={proofCardMist}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="proof-result">{p.result}</div>
                <div className="proof-result-label">{p.label}</div>
                <p className="proof-quote">{p.quote}</p>
                <div className="proof-author">
                  <div className="proof-avatar">{p.initials}</div>
                  <div className="proof-name">
                    <strong>{p.name}</strong>
                    {p.role}
                  </div>
                </div>
              </m.div>
            ))}
          </m.div>
        </m.section>

        {/* ─── CHANGED: Pricing — AEO feature descriptions ─── */}
        <section id="pricing">
          <m.div {...sectionMist.pricing}>
            <div className="pricing-label">Pricing</div>
            <h2 className="pricing-h2">
              Pay once.
              <br />
              <span>Scale fast.</span>
            </h2>
          </m.div>
          <m.div className="pricing-grid pricing-grid--two" {...priceStagger}>
            {LANDING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                featured={plan.featured}
                tier={
                  plan.featured ? `${plan.name} — Most Popular` : plan.name
                }
                amount={
                  <>
                    <sup>$</sup>
                    {plan.priceAmount / 100}
                  </>
                }
                per="One-time payment · Or redeem your code"
                feats={plan.features}
                cta="Get Started"
                href="/register"
              />
            ))}
          </m.div>
          <m.div {...sectionMist.pricing}>
            <p className="pricing-addon-note">
              Have a coupon code? Redeem it at signup and pay nothing. Need more room?
              Stack monthly usage boosts on either plan from your workspace — from $
              {CHEAPEST_ADD_ON_PRICE / 100}/mo.
            </p>
          </m.div>
        </section>

        {/* ─── CHANGED: CTA section — AEO final pitch ─── */}
        <m.section id="cta" {...sectionMist.finalCta}>
          <div className="cta-field" />
          <div className="cta-eyebrow">The window is open</div>
          <h2 className="cta-h2">
            Be cited.
            <br />
            <span>Not just</span>
            <br />
            <em>found.</em>
          </h2>
          <p className="cta-sub">
            The brands that win the next decade of search will be the ones that are cited
            inside AI answers today. That&apos;s Immortell.
          </p>
          <div className="cta-actions">
            <Link href="/register" className="btn-cta-main">
              Start for Free
            </Link>
            <a
              href={calendlyHref}
              className="btn-cta-ghost"
              target="_blank"
              rel="noreferrer noopener"
            >
              Book a Demo
            </a>
          </div>

          <div className="demo-block">
            <div className="demo-kicker">Want the 10-minute tour?</div>
            <div className="demo-title">Book a demo. We&apos;ll show you the "oh wow" parts.</div>
            <div className="demo-actions">
              <a
                href={calendlyHref}
                className="demo-link"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open Calendly →
              </a>
            </div>
          </div>
        </m.section>

        {/* ─── CHANGED: Footer — AEO platform labels ─── */}
        <m.footer {...sectionMist.footer}>
          <div className="footer-top">
            <div className="footer-brand">
              <Link href="/" className="footer-logo">
                Imm<span>◉</span>rtell
              </Link>
              <div className="footer-company">
                <p className="footer-company-name">Immortell Inc.</p>
                <p className="footer-company-line">Chennai, Tamil Nadu — India</p>
                <p className="footer-company-line">
                  <a href="tel:+919080866203">9080866203</a>
                  <span className="footer-company-sep" aria-hidden>
                    ·
                  </span>
                  <a href="mailto:srithebuilder@gmail.com">srithebuilder@gmail.com</a>
                </p>
              </div>
            </div>
            <div className="footer-cols">
              <div className="footer-col">
                <h5>Platform</h5>
                <ul>
                  <li>
                    <Link href="#">Read — Radar</Link>
                  </li>
                  <li>
                    <Link href="#">Write — Vault</Link>
                  </li>
                  <li>
                    <Link href="#">Rank — Citation Engine</Link>
                  </li>
                  <li>
                    <Link href="#">Protocol Layer</Link>
                  </li>
                </ul>
              </div>
              <div className="footer-col">
                <h5>Solutions</h5>
                <ul>
                  <li>
                    <Link href="#audience">For CMOs</Link>
                  </li>
                  <li>
                    <Link href="#audience">For Content Strategists</Link>
                  </li>
                  <li>
                    <Link href="#audience">For CTOs</Link>
                  </li>
                  <li>
                    <Link href="#pricing">Enterprise</Link>
                  </li>
                </ul>
              </div>
              <div className="footer-col">
                <h5>Resources</h5>
                <ul>
                  <li>
                    <Link href="#">Documentation</Link>
                  </li>
                  <li>
                    <Link href="#">API Reference</Link>
                  </li>
                  <li>
                    <Link href="#">AES Schema</Link>
                  </li>
                  <li>
                    <Link href="#">Blog</Link>
                  </li>
                </ul>
              </div>
              <div className="footer-col">
                <h5>Company</h5>
                <ul>
                  <li>
                    <Link href="#">About</Link>
                  </li>
                  <li>
                    <Link href="#">Careers</Link>
                  </li>
                  <li>
                    <Link href="#">Press</Link>
                  </li>
                  <li>
                    <Link href="#">Contact</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">
              © 2026 Immortell Inc. — <span>Answer Engine Optimization Platform</span>
            </div>
            <div className="footer-badges">
              <img
                src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light"
                width={120}
                height={32}
                alt="Fazier badge"
                className="footer-badge-fazier"
              />
              <img
                src="https://aixcollection.com/assets/images/badge.png"
                height={54}
                width={160}
                alt="AI X Collection"
                className="footer-badge-aix"
              />
            </div>
            <div className="footer-status">
              <span className="status-dot" /> All systems operational
            </div>
          </div>
        </m.footer>
      </div>
    </LazyMotion>
  );
}
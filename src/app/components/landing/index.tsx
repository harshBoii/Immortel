'use client';

import { Barlow, Barlow_Condensed, Space_Mono } from 'next/font/google';
import Link from 'next/link';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { memo, useEffect, useRef } from 'react';
import {
  HiCheckCircle,
  HiCreditCard,
  HiMagnifyingGlass,
  HiSignal,
  HiShoppingBag,
} from 'react-icons/hi2';
import './ac-landing.css';

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

const TICKER_LABELS = [
  'Read · Write · Convert',
  'UCP · ACP · AP2',
  'Citation Velocity',
  'Agentic Checkout',
  'Scoped Payment Tokens',
  'Bounty Lists',
  'One-Click Publish',
  'Knowledge Graph',
] as const;

const MARQUEE_PHRASES = [
  'Answer Commerce',
  'Be Bought',
  'Not Just Cited',
  'Instant Checkout',
  'Inside the AI Answer',
] as const;

const PROOF = [
  {
    result: '+340%',
    label: 'AI-attributed pipeline in 90 days',
    quote:
      '"Within 6 weeks of deploying the AEO Vault, we were the #1 cited brand in our category on Perplexity. The checkout conversion was the thing that floored the CFO."',
    initials: 'PN',
    name: 'Priya Nair',
    role: 'VP Marketing, Series B SaaS',
  },
  {
    result: '$84K',
    label: 'Closed from a single AI answer session',
    quote:
      '"A prospect asked ChatGPT what the best option was for their use case, got our product, and completed checkout inside the interface. I didn\'t even know it had happened until the Slack notification fired."',
    initials: 'JL',
    name: 'James Liu',
    role: 'VP Sales, DTC Brand',
  },
  {
    result: '2×',
    label: 'Conversion rate vs. traditional search traffic',
    quote:
      '"AI-referred visitors convert at double our Google rate because they arrive post-decision. Immortell\'s checkout layer means that intent doesn\'t go cold between AI and our site."',
    initials: 'ST',
    name: 'Sofia Torres',
    role: 'CMO, Consumer Brand',
  },
] as const;

const PricingCard = memo(function PricingCard({
  tier,
  amount,
  amountIsCustom,
  per,
  featured,
  feats,
  cta,
  href,
}: {
  tier: string;
  amount: React.ReactNode;
  amountIsCustom?: boolean;
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
      <div
        className="price-amount"
        style={
          amountIsCustom ? { fontSize: 48, paddingTop: 12 } : undefined
        }
      >
        {amount}
      </div>
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
            <Link href="#cta" className="nav-cta">
              Get Access
            </Link>
          </div>
        </m.nav>

        <section id="hero">
          <div className="hero-bg" />
          <div className="hero-field" />

          <m.div
            className="hero-slice"
            initial={{ opacity: 0, x: 56, filter: 'blur(14px)', scale: 0.97 }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 0.9, delay: 0.1, ease: easeMist }}
            aria-hidden
          >
            <div className="hero-slice-inner">
              <div className="hero-slice-text">
                ANSWER&nbsp;COMMERCE&nbsp;&nbsp;ANSWER&nbsp;COMMERCE&nbsp;&nbsp;ANSWER&nbsp;COMMERCE&nbsp;&nbsp;ANSWER&nbsp;COMMERCE&nbsp;&nbsp;
              </div>
            </div>
          </m.div>

          <m.div className="hero-content" {...heroParent}>
            <m.div className="hero-eyebrow" {...heroChild}>
              Answer Commerce Engine
            </m.div>
            <m.h1 className="hero-h1" {...heroChild}>
              The future
              <br />
              of commerce
              <br />
              <em>is being</em>
              <br />
              <span className="accent-line">written.</span>
            </m.h1>
            <m.p className="hero-sub" {...heroChild}>
              From citation to checkout — inside the AI answer. Immortell turns AI
              recommendations into instant transactions for your brand.
            </m.p>
            <m.div className="hero-actions" {...heroChild}>
              <Link href="#cta" className="btn-hero-main">
                Get Early Access
              </Link>
              <Link href="#framework" className="btn-hero-link">
                See the platform
              </Link>
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

        <section id="problem">
          <m.div className="problem-left" {...sectionMist.problem}>
            <div className="problem-label">The Shift</div>
            <h2 className="problem-h2">
              AI is the new
              <br />
              <strong>storefront.</strong>
              <br />
              Are you in it?
            </h2>
            <p className="problem-body">
              800 million weekly queries across Perplexity, ChatGPT, and Gemini. Your
              competitors are being recommended. Their products are being bought. The intent
              is there — the question is whether you convert it or watch it walk out the
              AI&apos;s door.
            </p>
          </m.div>
          <m.div className="problem-right" {...statStagger}>
            <m.div className="stat-block" {...statItem}>
              <div className="stat-n">800M</div>
              <div className="stat-l">Weekly AI product queries across all engines</div>
            </m.div>
            <m.div className="stat-block" {...statItem}>
              <div className="stat-n">50%+</div>
              <div className="stat-l">Queries now return AI Overviews, no click needed</div>
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

        <section id="framework">
          <div className="framework-bg-text">RWC</div>
          <m.div className="framework-header" {...sectionMist.framework}>
            <div className="framework-label">The Platform</div>
            <h2 className="framework-h2">
              Read. Write.
              <br />
              <span>Convert.</span>
            </h2>
          </m.div>
          <m.div className="rw-grid" {...rwGridStagger}>
            <m.div className="rw-card" variants={rwCard}>
              <div className="rw-num">01</div>
              <div className="rw-stage">Read</div>
              <div className="rw-sub">Radar Mapping &amp; Prompt Intel</div>
              <p className="rw-desc">
                We map exactly how every major AI engine sees your brand and your competitors.
                Find the gaps before they cost you deals.
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
                <li>Structured Knowledge Graph from your Shopify/Magento catalog</li>
                <li>Commerce Assertion Layer — machine-readable SKU metadata</li>
                <li>One-click publish to all answer engines simultaneously</li>
              </ul>
            </m.div>
            <m.div className="rw-card" variants={rwCard}>
              <div className="rw-num">03</div>
              <div className="rw-stage">Convert</div>
              <div className="rw-sub">Agentic Checkout Engine</div>
              <p className="rw-desc">
                The moat. Don&apos;t just get recommended — get bought. Native checkout inside
                the AI answer, no redirect, no friction.
              </p>
              <ul className="rw-bullets">
                <li>Native checkout within ChatGPT, Perplexity, Gemini answers</li>
                <li>Scoped Payment Tokens via AP2 Trust Layer</li>
                <li>Real-time inventory validation before every transaction</li>
                <li>Conversion data loops back to strengthen the AEO Vault</li>
              </ul>
            </m.div>
          </m.div>
        </section>

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
                <div className="proto-tag">UCP</div>
                <div className="proto-body">
                  <div className="proto-name">Universal Commerce Protocol</div>
                  <div className="proto-desc">
                    Translates your merchant data into Google&apos;s standard for Gemini Shopping
                    and AI Search. Your SKUs, structured and ready for the world&apos;s most-used
                    AI.
                  </div>
                </div>
              </m.div>
              <m.div className="proto-row" {...protoRowVar}>
                <div className="proto-tag">ACP</div>
                <div className="proto-body">
                  <div className="proto-name">Agentic Commerce Protocol</div>
                  <div className="proto-desc">
                    The OpenAI/Stripe gateway standard. Enables native checkout completion inside
                    ChatGPT&apos;s Operator framework — your Shopify store, inside the AI answer.
                  </div>
                </div>
              </m.div>
              <m.div className="proto-row" {...protoRowVar}>
                <div className="proto-tag">AP2</div>
                <div className="proto-body">
                  <div className="proto-name">Agent Payments Protocol</div>
                  <div className="proto-desc">
                    The Trust Layer. Cryptographic spend mandates and Scoped Payment Tokens let AI
                    agents transact on behalf of users — securely, with defined limits.
                  </div>
                </div>
              </m.div>
              <m.div className="proto-row proto-mw" {...protoRowVar}>
                <div className="proto-body">
                  <div className="proto-name ac-muted">Immortell is the Unified Middleware</div>
                  <div className="proto-desc">
                    You connect once via our Shopify/Magento plugin. We handle all three protocol
                    translations, keep your catalog in sync, and route transactions through the
                    right standard per AI engine.
                  </div>
                </div>
              </m.div>
            </m.div>

            <m.div
              className="protocol-right"
              initial={{ opacity: 0, x: 40, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.85, ease: easeMist, delay: 0.08 }}
            >
              <div className="cal-box">
                <span className="cal-comment">// Commerce Assertion Layer — CAL v1</span>
                <br />
                {'{'}
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;@context&quot;</span>:{' '}
                <span className="cal-str">&quot;immortell:commerce/v1&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;assertionType&quot;</span>:{' '}
                <span className="cal-str">&quot;purchasable_entity&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;sku_id&quot;</span>:{' '}
                <span className="cal-str">&quot;BRAND-SKU-4421&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;price_snapshot&quot;</span>: {'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-key">&quot;amount&quot;</span>:{' '}
                <span className="cal-num">49.00</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-key">&quot;currency&quot;</span>:{' '}
                <span className="cal-str">&quot;USD&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-key">&quot;ttl_seconds&quot;</span>:{' '}
                <span className="cal-num">300</span>
                <br />
                &nbsp;&nbsp;{'}'},
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;inventory_signal&quot;</span>:{' '}
                <span className="cal-str">&quot;in_stock&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;checkout_endpoint&quot;</span>:{' '}
                <span className="cal-str">&quot;acp://immortell/checkout/4421&quot;</span>,
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;trust_scope&quot;</span>: [
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-str">&quot;read_price&quot;</span>,{' '}
                <span className="cal-str">&quot;initiate_checkout&quot;</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="cal-str">&quot;complete_purchase&quot;</span>
                <br />
                &nbsp;&nbsp;],
                <br />
                &nbsp;&nbsp;<span className="cal-key">&quot;merchant_id&quot;</span>:{' '}
                <span className="cal-str">&quot;shopify:brand-8821&quot;</span>
                <br />
                {'}'}
                <span className="cal-cursor" />
              </div>
            </m.div>
          </div>
        </section>

        <section id="checkout">
          <div className="checkout-bg-text">BUY</div>
          <m.div className="checkout-header" {...sectionMist.checkout}>
            <div className="checkout-label">The Conversion Loop</div>
            <h2 className="checkout-h2">
              From AI answer to
              <br />
              <strong>paid order.</strong>
              <br />
              Zero redirects.
            </h2>
          </m.div>
          <m.div className="flow-steps" {...flowStagger}>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiMagnifyingGlass />
              </div>
              <div className="flow-title">User Queries AI</div>
              <p className="flow-desc">
                &quot;Best running shoes under $120&quot; — high-intent, ready to buy.
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
              <div className="flow-title">Vault Fires CAL</div>
              <p className="flow-desc">
                Your AEO page is cited. Commerce Assertion Layer signals purchase availability.
              </p>
              <div className="flow-badge">CAL Assertion</div>
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
                Price freshness check, inventory confirmation, mandate scope verified.
              </p>
              <div className="flow-badge">AP2 Trust Layer</div>
            </m.div>
            <m.div className="flow-connector" aria-hidden {...flowConnVar}>
              →
            </m.div>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiCreditCard />
              </div>
              <div className="flow-title">Scoped Token Issued</div>
              <p className="flow-desc">
                Time-bound SPT authorises the exact transaction amount. No card details shared.
              </p>
              <div className="flow-badge">ACP / Stripe</div>
            </m.div>
            <m.div className="flow-connector" aria-hidden {...flowConnVar}>
              →
            </m.div>
            <m.div className="flow-step" {...flowStepMotion}>
              <div className="flow-icon" aria-hidden>
                <HiShoppingBag />
              </div>
              <div className="flow-title">Order Confirmed</div>
              <p className="flow-desc">
                Shopify fulfillment triggered. Conversion data loops to the AEO Vault.
              </p>
              <div className="flow-badge">Zero Redirects</div>
            </m.div>
          </m.div>
        </section>

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
                your brand&apos;s truth to every answer engine simultaneously.
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
              <div className="aud-role">For DTC Founders</div>
              <h3 className="aud-h3">
                Your Shopify
                <br />
                store inside
                <br />
                ChatGPT.
              </h3>
              <p className="aud-body aud-2">
                Connect in 5 minutes. Your catalog gets structured, cited, and made purchasable
                inside every major AI interface — no engineers needed.
              </p>
              <ul className="aud-features aud-2">
                <li>Shopify &amp; Magento native plugin</li>
                <li>Automatic SKU-to-protocol mapping</li>
                <li>Native checkout in AI answers</li>
                <li>Revenue attribution per AI engine</li>
              </ul>
            </div>
            <Link href="#cta" className="aud-cta">
              See founder features →
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
                UCP, ACP, AP2 — three incompatible emerging standards, 18 months of engineering, or
                one Immortell API call. We maintain the integrations as standards evolve.
              </p>
              <ul className="aud-features aud-3">
                <li>REST API + Webhook architecture</li>
                <li>UCP · ACP · AP2 protocol coverage</li>
                <li>Commerce Assertion Layer (CAL) schema</li>
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

        <section id="pricing">
          <m.div {...sectionMist.pricing}>
            <div className="pricing-label">Pricing</div>
            <h2 className="pricing-h2">
              Start free.
              <br />
              <span>Scale fast.</span>
            </h2>
          </m.div>
          <m.div className="pricing-grid" {...priceStagger}>
            <PricingCard
              tier="Starter"
              amount={
                <>
                  <sup>$</sup>0
                </>
              }
              per="Free forever · No card required"
              feats={[
                '3 AI engine scans per month',
                '1 domain tracked',
                '50 prompts in Bounty List',
                '2 AEO pages generated',
                'Citation velocity dashboard',
                'No checkout / no protocol access',
              ]}
              cta="Get Started Free"
              href="#cta"
            />
            <PricingCard
              featured
              tier="Growth — Most Popular"
              amount={
                <>
                  <sup>$</sup>499
                </>
              }
              per="per month · billed monthly"
              feats={[
                'Unlimited AI engine scans',
                '3 domains tracked',
                '1,000 prompts in Bounty List',
                '20 AEO pages/month',
                'Agentic Checkout (UCP + ACP)',
                'AP2 Trust Layer + Scoped Tokens',
                'Shopify & Magento integration',
                'Revenue attribution dashboard',
              ]}
              cta="Start 14-Day Trial"
              href="#cta"
            />
            <PricingCard
              tier="Enterprise"
              amount="Custom"
              amountIsCustom
              per="Annual · Volume pricing"
              feats={[
                'Unlimited domains & SKUs',
                'Full protocol stack (UCP/ACP/AP2)',
                'Commerce Assertion Layer API',
                'Custom Knowledge Graph builds',
                'SSO, audit logs, GDPR DPA',
                'Dedicated solutions engineer',
                'SLA + white-glove onboarding',
              ]}
              cta="Talk to Sales"
              href="#cta"
            />
          </m.div>
        </section>

        <m.section id="cta" {...sectionMist.finalCta}>
          <div className="cta-field" />
          <div className="cta-eyebrow">The window is open</div>
          <h2 className="cta-h2">
            Be bought.
            <br />
            <span>Not just</span>
            <br />
            <em>cited.</em>
          </h2>
          <p className="cta-sub">
            The brands that win the next decade of commerce will be the ones that are purchasable
            inside AI answers today. That&apos;s Immortell.
          </p>
          <div className="cta-actions">
            <Link href="/login" className="btn-cta-main">
              Start for Free
            </Link>
            <Link href="#pricing" className="btn-cta-ghost">
              Book a Demo
            </Link>
          </div>
        </m.section>

        <m.footer {...sectionMist.footer}>
          <div className="footer-top">
            <Link href="/" className="footer-logo">
              Imm<span>◉</span>rtell
            </Link>
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
                    <Link href="#">Convert — Checkout</Link>
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
                    <Link href="#audience">For DTC Founders</Link>
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
                    <Link href="#">CAL Schema</Link>
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
              © 2026 Immortell Inc. — <span>Answer Commerce Engine</span>
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

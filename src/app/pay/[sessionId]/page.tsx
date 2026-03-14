'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type CheckoutProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  priceMinAmount: string | null;
  priceMaxAmount: string | null;
  currencyCode: string | null;
  onlineStoreUrl: string | null;
};

type CheckoutSession = {
  sessionId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  products: CheckoutProduct[];
  createdAt: string;
  expiresAt: string;
};

type PaymentState = 'idle' | 'processing' | 'success' | 'error';

function formatPrice(amount: string | null, currency: string | null) {
  if (!amount) return '—';
  const num = parseFloat(amount);
  return `${currency ?? ''} ${num.toFixed(2)}`.trim();
}

function decodeSession(encoded: string): CheckoutSession | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json) as CheckoutSession;
  } catch {
    return null;
  }
}

export default function PaymentPortalPage() {
  const params = useParams();
  const sessionIdParam = params?.sessionId as string | undefined;

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [expired, setExpired] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!sessionIdParam) {
      setInvalid(true);
      return;
    }
    const decoded = decodeSession(sessionIdParam);
    if (!decoded) {
      setInvalid(true);
      return;
    }
    if (new Date(decoded.expiresAt) < new Date()) {
      setExpired(true);
      setSession(decoded);
      return;
    }
    setSession(decoded);
  }, [sessionIdParam]);

  const totalAmount = session?.products.reduce((acc, p) => {
    return acc + (p.priceMinAmount ? parseFloat(p.priceMinAmount) : 0);
  }, 0) ?? 0;

  const currency = session?.products[0]?.currencyCode ?? 'USD';

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvv || !name) return;
    setPaymentState('processing');

    // Simulate a 2-second payment processing delay
    setTimeout(() => {
      setPaymentState('success');
    }, 2000);
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  if (invalid) {
    return (
      <PageShell>
        <ErrorCard title="Invalid Payment Link" message="This payment link is malformed or has been tampered with." />
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <div className="text-sm text-muted-foreground animate-pulse">Loading payment details…</div>
      </PageShell>
    );
  }

  if (expired) {
    return (
      <PageShell>
        <ErrorCard title="Payment Link Expired" message={`This checkout session expired at ${new Date(session.expiresAt).toLocaleTimeString()}. Please start a new checkout.`} />
      </PageShell>
    );
  }

  if (paymentState === 'success') {
    return (
      <PageShell>
        <div className="w-full max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <h2 className="text-xl font-semibold text-foreground">Payment Successful</h2>
          <p className="text-sm text-muted-foreground">
            Thank you! Your order from <span className="text-foreground font-medium">{session.companyName}</span> has been placed.
          </p>
          <div className="glass-card rounded-xl border border-[var(--glass-border)] p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground">Session ID</p>
            <p className="text-xs font-mono text-foreground break-all">{session.sessionId}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            (This is a demo — no real charge was made.)
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="w-full max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-6 items-start">
        {/* Order summary */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Store</p>
            <h2 className="text-lg font-semibold text-foreground font-heading">{session.companyName}</h2>
          </div>
          <div className="glass-card rounded-xl border border-[var(--glass-border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--glass-border)]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Order Summary</p>
            </div>
            <ul className="divide-y divide-[var(--glass-border)]">
              {session.products.map((p) => (
                <li key={p.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.handle}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {formatPrice(p.priceMinAmount, p.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-sm font-bold text-foreground">
                {currency} {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Expires {new Date(session.expiresAt).toLocaleTimeString()}
          </p>
        </div>

        {/* Payment form */}
        <div className="glass-card rounded-xl border border-[var(--glass-border)] p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Payment Details</h3>
          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cardholder Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="4242 4242 4242 4242"
                required
                maxLength={19}
                inputMode="numeric"
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] text-foreground placeholder:text-muted-foreground font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Expiry</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  required
                  maxLength={5}
                  inputMode="numeric"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] text-foreground placeholder:text-muted-foreground font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  required
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--glass-hover)] border border-[var(--glass-border)] focus:outline-none focus:ring-1 focus:ring-[var(--sibling-primary)] text-foreground placeholder:text-muted-foreground font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={paymentState === 'processing'}
              className="w-full mt-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[var(--sibling-primary)] hover:bg-[var(--sibling-primary)]/90 text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {paymentState === 'processing'
                ? 'Processing…'
                : `Pay ${currency} ${totalAmount.toFixed(2)}`}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Demo portal — no real charge will be made.
            </p>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full mb-8 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">Secure Checkout</p>
        <h1 className="text-2xl font-semibold font-heading text-foreground mt-1">Payment Portal</h1>
      </div>
      {children}
    </main>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="w-full max-w-sm mx-auto text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center mx-auto text-2xl">
        ✕
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

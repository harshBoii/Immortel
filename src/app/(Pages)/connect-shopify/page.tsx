'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function normalizeShopInput(input: string): string {
  let shop = input.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!shop.endsWith('.myshopify.com')) {
    shop = `${shop}.myshopify.com`;
  }
  return shop;
}

export default function ConnectShopifyPage() {
  const router = useRouter();
  const [shopInput, setShopInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shopInput.trim()) {
      setError('Please enter your Shopify store domain.');
      return;
    }

    const normalized = normalizeShopInput(shopInput);

    // Basic sanity check
    if (!/^[a-z0-9-]+\.myshopify\.com$/.test(normalized)) {
      setError('Please enter a valid myshop.myshopify.com domain.');
      return;
    }

    setIsSubmitting(true);
    try {
      router.push(`/shopify/install?shop=${encodeURIComponent(normalized)}`);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md glass-card p-8">
        <h1 className="text-2xl font-semibold font-heading text-foreground">
          Connect your Shopify store
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Step 2 of 2. Enter your Shopify store domain to authorize access and link it to your
          workspace (OAuth).
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Store domain
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shopInput}
                onChange={(e) => setShopInput(e.target.value)}
                placeholder="my-store.myshopify.com"
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-hover)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You can paste the full URL (we&apos;ll clean it up for you).
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-primary to-violet-500 text-primary-foreground py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Redirecting to Shopify…' : 'Connect Shopify'}
          </button>
        </form>
      </div>
    </div>
  );
}


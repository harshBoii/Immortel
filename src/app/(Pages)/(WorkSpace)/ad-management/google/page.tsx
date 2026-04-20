'use client';

import Link from 'next/link';

export default function GoogleAdsComingSoonPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)]/50 px-8 py-10 shadow-sm">
        <h1 className="text-lg font-semibold">Google Ads</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Google ad management is coming soon. You can continue with Meta from the sidebar.
        </p>
        <Link
          href="/ad-management/meta"
          className="mt-6 inline-flex rounded-lg bg-[var(--sibling-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Go to Meta
        </Link>
      </div>
    </div>
  );
}

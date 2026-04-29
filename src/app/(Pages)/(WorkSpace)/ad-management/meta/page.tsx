'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';
import { TabNav, type MetaTabId } from './components/TabNav';
import { ProfileTab } from './components/ProfileTab';
import { CreativesTab } from './components/CreativesTab';
import { CampaignsTab } from './components/CampaignsTab';
import { AdSetsTab } from './components/AdSetsTab';
import { AdCreativesTab } from './components/AdCreativesTab';
import { AdsTab } from './components/AdsTab';
import { AnalysisTab } from './components/AnalysisTab';
import { AdGenerationTab } from './components/AdGenerationTab';
import { AdJobsTab } from './components/AdJobsTab';

const TABS: MetaTabId[] = [
  'profile',
  'creatives',
  'campaigns',
  'adsets',
  'adcreatives',
  'ads',
  'ad_generation',
  'ad_jobs',
  'analysis',
];

function isTab(s: string | null): s is MetaTabId {
  return Boolean(s && (TABS as string[]).includes(s));
}

function MetaAdManagementInner() {
  const { meta } = useCurrentContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams?.get('tab');
  const activeTab: MetaTabId = useMemo(
    () => (tabFromUrl && isTab(tabFromUrl) ? tabFromUrl : 'profile'),
    [tabFromUrl],
  );

  const setTab = (id: MetaTabId) => {
    const q = new URLSearchParams(searchParams?.toString() ?? '');
    q.set('tab', id);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Meta ads</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage profile, creatives, campaigns, ad sets, creatives, and ads.
        </p>
      </div>

      {!meta && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Connect your Meta ad account to use these tools.{' '}
          <Link
            href="/connection"
            className="font-semibold text-[var(--sibling-primary)] underline-offset-2 hover:underline"
          >
            Open Connections
          </Link>
        </div>
      )}

      <TabNav active={activeTab} onChange={setTab} />

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'creatives' && <CreativesTab />}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'adsets' && <AdSetsTab />}
      {activeTab === 'adcreatives' && <AdCreativesTab />}
      {activeTab === 'ads' && <AdsTab />}
      {activeTab === 'ad_generation' && <AdGenerationTab />}
      {activeTab === 'ad_jobs' && <AdJobsTab />}
      {activeTab === 'analysis' && <AnalysisTab />}
    </div>
  );
}

export default function MetaAdManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <MetaAdManagementInner />
    </Suspense>
  );
}

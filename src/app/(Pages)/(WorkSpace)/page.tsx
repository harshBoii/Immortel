import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import WorkforceHome from '@/app/components/home/WorkforceHome';

const MCP_LINK = 'https://immortel.vercel.app/api/mcpServer';

/**
 * Pulls a friendly first-name-ish token from the company record.
 * Falls back to the local-part of the email if name is missing.
 */
function deriveFirstName(company: { name: string | null; email: string | null } | null): string {
  const raw = (company?.name ?? '').trim();
  if (raw) {
    const first = raw.split(/\s+/)[0];
    if (first) return first;
  }
  const local = (company?.email ?? '').split('@')[0]?.trim();
  if (local) {
    const first = local.split(/[.\-_+]/)[0];
    if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return 'there';
}

export default async function HomePage() {
  const session = await getSession();
  if (!session?.companyId) redirect('/login');
  const companyId = session.companyId;

  const [
    company,
    shopifyShop,
    metaIntegration,
    wooStore,
    wordpressIntegration,
    latestRadar,
    pendingAdsCount,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, email: true },
    }),
    prisma.shopifyShop.findFirst({
      where: { companyId },
      select: { id: true, status: true },
      orderBy: { installedAt: 'desc' },
    }),
    prisma.metaIntegration.findUnique({
      where: { companyId },
      select: { id: true },
    }),
    prisma.wooCommerceStore.findFirst({
      where: { companyId },
      select: { id: true, status: true },
      orderBy: { installedAt: 'desc' },
    }),
    prisma.wordPressIntegration.findUnique({
      where: { tenantId: companyId },
      select: { id: true },
    }),
    prisma.llmRadarMetric.findFirst({
      where: { companyId },
      orderBy: { calculatedAt: 'desc' },
      select: { shareOfVoice: true, top3Rate: true },
    }),
    prisma.metaCreative.count({
      where: {
        metaIntegration: { companyId },
        approvedByUser: false,
      },
    }),
  ]);

  const firstName = deriveFirstName(company);
  const geoVisibilityPct =
    latestRadar?.shareOfVoice ?? latestRadar?.top3Rate ?? null;

  return (
    <WorkforceHome
      firstName={firstName}
      geoVisibilityPct={geoVisibilityPct}
      callsToday={0}
      adsPendingApproval={pendingAdsCount}
      integrations={{
        shopify: Boolean(shopifyShop),
        meta: Boolean(metaIntegration),
        mcp: true,
        woocommerce: Boolean(wooStore),
        wordpress: Boolean(wordpressIntegration),
      }}
      mcpLink={MCP_LINK}
    />
  );
}

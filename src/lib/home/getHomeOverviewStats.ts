import { IntegrationProvider, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type HomeOverviewSnapshot = {
  companyName: string;
  shopifyStoreLabel: string | null;
  productCount: number;
  promptCount: number;
  expectedPromptRevenueUsd: number | null;
};

function promptCompanyWhere(companyId: string): Prisma.PromptWhereInput {
  return {
    OR: [
      { llmTopic: { companyId } },
      { llmPromptMetrics: { some: { companyId } } },
    ],
  };
}

export async function getHomeOverviewStats(
  companyId: string
): Promise<HomeOverviewSnapshot> {
  const scope = promptCompanyWhere(companyId);

  const [company, shop, cms, productCount, promptCount, revenueAgg] =
    await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
      prisma.shopifyShop.findFirst({
        where: { companyId, status: "installed" },
        orderBy: { createdAt: "desc" },
        select: { shopDomain: true },
      }),
      prisma.companyIntegrationCms.findUnique({
        where: {
          companyId_provider: {
            companyId,
            provider: IntegrationProvider.Shopify,
          },
        },
        select: { expectedShopDomain: true },
      }),
      prisma.shopifyProduct.count({ where: { companyId } }),
      prisma.prompt.count({ where: scope }),
      prisma.promptRevenue.aggregate({
        _sum: { estimatedRevenue: true },
        where: { prompt: { ...scope } },
      }),
    ]);

  const installed = shop?.shopDomain?.trim();
  const expected = cms?.expectedShopDomain?.trim() ?? "";

  let shopifyStoreLabel: string | null = null;
  if (installed) shopifyStoreLabel = installed;
  else if (expected) shopifyStoreLabel = `${expected} (not connected)`;

  const raw = revenueAgg._sum?.estimatedRevenue;
  const expectedPromptRevenueUsd =
    raw != null && Number.isFinite(raw) ? raw : null;

  return {
    companyName: company?.name?.trim() || "—",
    shopifyStoreLabel,
    productCount,
    promptCount,
    expectedPromptRevenueUsd,
  };
}

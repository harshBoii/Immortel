import { IntegrationProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeShopDomain } from "./client";

/**
 * Resolve Immortel companyId for Shopify Admin / OAuth flows:
 * 1) Installed shop row (source of truth after connect)
 * 2) CMS row whose expectedShopDomain matches the incoming shop (pre-install)
 */
export async function resolveCompanyIdForShopifyLoad(
  rawShopDomain: string
): Promise<string | null> {
  let shop: string;
  try {
    shop = normalizeShopDomain(rawShopDomain);
  } catch {
    return null;
  }

  const installed = await prisma.shopifyShop.findUnique({
    where: { shopDomain: shop },
    select: { companyId: true },
  });
  if (installed) return installed.companyId;

  const cms = await prisma.companyIntegrationCms.findFirst({
    where: {
      provider: IntegrationProvider.Shopify,
      expectedShopDomain: shop,
    },
    select: { companyId: true },
  });
  return cms?.companyId ?? null;
}

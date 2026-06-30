import { redeemCouponForCompany } from "@/lib/subscription/coupon";
import { triggerGeoAutoSeed } from "@/lib/subscription/trigger-geo-auto-seed";

export async function activateCouponPlan(companyId: string, code: string) {
  const result = await redeemCouponForCompany({ companyId, code });
  await triggerGeoAutoSeed(companyId);
  return result;
}

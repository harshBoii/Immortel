import DodoPayments from "dodopayments";
import { getDodoProductId, type PaidPlanId } from "@/lib/subscription/plans";

function getDodoClient() {
  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as
      | "test_mode"
      | "live_mode",
  });
}

export async function createPlanCheckoutSession(opts: {
  companyId: string;
  plan: PaidPlanId;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}) {
  const productId = getDodoProductId(opts.plan);
  const dodo = getDodoClient();

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: opts.customerEmail,
      name: opts.customerName,
    },
    metadata: {
      companyId: opts.companyId,
      plan: opts.plan,
      intent: "plan_change",
    },
    return_url: opts.returnUrl,
  });

  return session.checkout_url;
}

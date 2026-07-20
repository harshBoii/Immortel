import DodoPayments from "dodopayments";
import {
  getDodoAddOnProductId,
  getDodoPlanProductId,
  type AddOnId,
  type DealifyPlanId,
} from "@/lib/subscription/plans";

function getDodoClient() {
  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as
      | "test_mode"
      | "live_mode",
  });
}

/** Dodo types checkout_url as optional; a session without one is unusable to us. */
function requireCheckoutUrl(url: string | null | undefined): string {
  if (!url?.trim()) {
    throw new Error("Dodo returned a checkout session with no checkout_url");
  }
  return url;
}

/**
 * Start checkout for a Dealify plan bought without a coupon.
 *
 * This is a one-time charge, so activation arrives as `payment.succeeded` rather than
 * the `subscription.*` events add-ons use — hence the distinct `plan_purchase` intent.
 */
export async function createPlanCheckoutSession(opts: {
  companyId: string;
  plan: DealifyPlanId;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}) {
  const productId = getDodoPlanProductId(opts.plan);
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
      intent: "plan_purchase",
    },
    return_url: opts.returnUrl,
  });

  return requireCheckoutUrl(session.checkout_url);
}

/**
 * Start checkout for a monthly add-on. Add-ons layer extra usage on top of an already
 * active Dealify base plan — they never change the plan itself, which is why the
 * metadata carries `intent: "addon_purchase"` for the webhook to branch on.
 */
export async function createAddOnCheckoutSession(opts: {
  companyId: string;
  addOn: AddOnId;
  quantity?: number;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}) {
  const productId = getDodoAddOnProductId(opts.addOn);
  const quantity = Math.max(1, opts.quantity ?? 1);
  const dodo = getDodoClient();

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity }],
    customer: {
      email: opts.customerEmail,
      name: opts.customerName,
    },
    metadata: {
      companyId: opts.companyId,
      addOnType: opts.addOn,
      quantity: String(quantity),
      intent: "addon_purchase",
    },
    return_url: opts.returnUrl,
  });

  return requireCheckoutUrl(session.checkout_url);
}

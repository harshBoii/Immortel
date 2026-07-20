import DodoPayments from "dodopayments";
import { getDodoAddOnProductId, type AddOnId } from "@/lib/subscription/plans";

function getDodoClient() {
  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as
      | "test_mode"
      | "live_mode",
  });
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

  return session.checkout_url;
}

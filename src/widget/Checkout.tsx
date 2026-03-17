import { useEffect, useState } from "react";
import { Button } from "@openai/apps-sdk-ui/components/Button";

type CheckoutSummary = {
  total?: number | string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  currencyCode?: string | null;
  url?: string | null;
};

type CheckoutPayload = {
  total?: number | string | null;
  currency?: string | null;
  currencyCode?: string | null;
  checkoutUrl?: string | null;
  url?: string | null;
  summary?: CheckoutSummary | null;
};

type ToolResult = {
  toolName?: string;
  structuredContent?: CheckoutPayload;
};

declare global {
  interface Window {
    openai?: {
      on?: (event: string, handler: (result: any) => void) => void;
      off?: (event: string, handler: (result: any) => void) => void;
    };
  }
}

const openai = window.openai;

export default function Checkout() {
  const [data, setData] = useState<CheckoutPayload | null>(null);

  useEffect(() => {
    if (!openai?.on) return;

    const handler = (result: ToolResult) => {
      if (result.toolName === "create_checkout" && result.structuredContent) {
        setData(result.structuredContent);
      }
    };

    openai.on("ui/notifications/tool-result", handler);

    return () => {
      openai.off?.("ui/notifications/tool-result", handler);
    };
  }, []);

  if (!data) {
    return <div>Waiting for checkout data…</div>;
  }

  const summary = data.summary ?? {};
  const total =
    summary.total ??
    summary.totalAmount ??
    data.total ??
    (data as any).totalAmount ??
    null;

  const currency =
    summary.currency ??
    summary.currencyCode ??
    data.currency ??
    data.currencyCode ??
    null;

  const checkoutUrl = data.checkoutUrl ?? data.url ?? summary.url ?? null;

  return (
    <div className="border border-gray-200 rounded-xl p-3 flex flex-col gap-3">
      <h3 className="font-semibold text-base">Checkout</h3>

      {total != null && (
        <p className="font-medium">
          Total: {currency ? `${currency} ` : ""}
          {total}
        </p>
      )}

      {checkoutUrl ? (
        <Button
          onClick={() => {
            try {
              window.open(checkoutUrl, "_blank");
            } catch (e) {
              console.error("Failed to open checkout URL:", e);
            }
          }}
        >
          Open Checkout
        </Button>
      ) : (
        <p className="text-sm text-gray-500">No checkout URL available.</p>
      )}
    </div>
  );
}


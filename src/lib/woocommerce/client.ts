import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";
import type { WooCommerceStore } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/wordpress/crypto";
import { codeFromHttpStatus, messageForCode, type WooCommerceErrorCode } from "./errors";

/** Default true: avoids stripped Authorization on some HTTPS / FastCGI setups. Set WOOCOMMERCE_QUERY_STRING_AUTH=false to force header auth. */
function readQueryStringAuthFlag(): boolean {
  const v = process.env.WOOCOMMERCE_QUERY_STRING_AUTH?.trim().toLowerCase();
  if (v === "false" || v === "0") return false;
  return true;
}

export type WooClientResult =
  | {
      ok: true;
      client: WooCommerceRestApi;
      store: WooCommerceStore;
    }
  | {
      ok: false;
      error: "NO_STORE" | "DECRYPT_FAILED";
    };

export async function getWooCommerceRestApiForCompany(
  companyId: string
): Promise<WooClientResult> {
  const store = await prisma.wooCommerceStore.findFirst({
    where: { companyId, status: "installed" },
    orderBy: { installedAt: "desc" },
  });

  if (!store) {
    return { ok: false, error: "NO_STORE" };
  }

  let consumerKey: string;
  let consumerSecret: string;
  try {
    consumerKey = decrypt(store.consumerKeyEnc);
    consumerSecret = decrypt(store.consumerSecretEnc);
  } catch {
    return { ok: false, error: "DECRYPT_FAILED" };
  }

  const client = new WooCommerceRestApi({
    url: store.storeUrl,
    consumerKey,
    consumerSecret,
    version: "wc/v3",
    queryStringAuth: readQueryStringAuthFlag(),
  });

  return { ok: true, client, store };
}

/** Axios-style error from @woocommerce/woocommerce-rest-api */
export function parseWooCommerceAxiosError(err: unknown): {
  code: WooCommerceErrorCode;
  message: string;
  httpStatus?: number;
} {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { status?: number; data?: unknown } }).response;
    const status = res?.status;
    const code = codeFromHttpStatus(status);
    return { code, message: messageForCode(code), httpStatus: status };
  }
  if (err && typeof err === "object" && "request" in err && !("response" in err)) {
    return { code: "WC_NETWORK", message: messageForCode("WC_NETWORK") };
  }
  return { code: "WC_UNKNOWN", message: messageForCode("WC_UNKNOWN") };
}

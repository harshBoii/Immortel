/**
 * Maps WooCommerce REST / HTTP failures to stable codes for logs and UI.
 * 401 → re-auth; 404 missing resource; 400 invalid params; 500 store-side.
 */
export type WooCommerceErrorCode =
  | "WC_UNAUTHORIZED"
  | "WC_NOT_FOUND"
  | "WC_BAD_REQUEST"
  | "WC_SERVER_ERROR"
  | "WC_NETWORK"
  | "WC_UNKNOWN";

export function codeFromHttpStatus(status: number | undefined): WooCommerceErrorCode {
  if (status === 401) return "WC_UNAUTHORIZED";
  if (status === 404) return "WC_NOT_FOUND";
  if (status === 400 || status === 422) return "WC_BAD_REQUEST";
  if (status !== undefined && status >= 500) return "WC_SERVER_ERROR";
  return "WC_UNKNOWN";
}

export function messageForCode(code: WooCommerceErrorCode): string {
  switch (code) {
    case "WC_UNAUTHORIZED":
      return "WooCommerce rejected the API keys. Reconnect your store.";
    case "WC_NOT_FOUND":
      return "The requested WooCommerce resource was not found.";
    case "WC_BAD_REQUEST":
      return "Invalid request parameters for WooCommerce.";
    case "WC_SERVER_ERROR":
      return "The store returned a server error. Try again later.";
    case "WC_NETWORK":
      return "Could not reach the WooCommerce store.";
    default:
      return "WooCommerce request failed.";
  }
}

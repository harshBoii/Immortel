export function getProxiedImageUrl(
  originalUrl: string | null | undefined
): string | null {
  if (!originalUrl) return null;
  const encoded = encodeURIComponent(originalUrl);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_PRODUCTION_URL && process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_PRODUCTION_URL
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Always return a fully-qualified URL for MCP consumers
  return `${baseUrl.replace(/\/+$/, "")}/api/image-proxy?url=${encoded}`;
}



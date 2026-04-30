import { verifyCreativeUploadToken } from "@/lib/mcp/creativeUploadToken";

export function tokenFromRequest(req: Request): string | null {
  const h = req.headers.get("x-upload-token");
  if (h && h.trim()) return h.trim();
  const u = new URL(req.url);
  const q = u.searchParams.get("t");
  return q && q.trim() ? q.trim() : null;
}

export function requireValidUploadToken(req: Request): { companyId: string; allowedTypes?: Array<"IMAGE" | "VIDEO"> } {
  const token = tokenFromRequest(req);
  if (!token) throw new Error("MISSING_UPLOAD_TOKEN");
  const payload = verifyCreativeUploadToken(token);
  if (!payload) throw new Error("INVALID_UPLOAD_TOKEN");
  return { companyId: payload.companyId, allowedTypes: payload.allowedTypes };
}


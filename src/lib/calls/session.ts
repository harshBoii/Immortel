import { getSession } from "@/lib/auth";

export type CallsSession = { companyId: string };

/**
 * Returns the active calling-agent session (companyId) or null if unauthenticated.
 * All `/api/calls/*` routes should gate on this before touching `prisma`.
 */
export async function getCallsSession(): Promise<CallsSession | null> {
  const s = await getSession();
  if (!s?.companyId) return null;
  return { companyId: s.companyId };
}

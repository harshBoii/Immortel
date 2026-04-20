import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/meta/crypto";

export type LoadedMetaIntegration = {
  integrationId: string;
  companyId: string;
  accessToken: string;
  adAccountId: string;
  fbPageId: string;
  /** Normalized `act_…` id for Graph paths */
  actId: string;
};

export async function loadIntegrationForSession(): Promise<LoadedMetaIntegration | null> {
  const session = await getSession();
  if (!session?.companyId) return null;

  const row = await prisma.metaIntegration.findUnique({
    where: { companyId: session.companyId },
  });
  if (!row) return null;

  let accessToken: string;
  try {
    accessToken = decrypt(row.accessToken);
  } catch {
    return null;
  }

  const raw = row.adAccountId.replace(/^act_/, "");
  const actId = row.adAccountId.startsWith("act_") ? row.adAccountId : `act_${raw}`;

  return {
    integrationId: row.id,
    companyId: session.companyId,
    accessToken,
    adAccountId: row.adAccountId,
    fbPageId: row.fbPageId,
    actId,
  };
}

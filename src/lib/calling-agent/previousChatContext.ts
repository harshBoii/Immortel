import { prisma } from "@/lib/prisma";

const SUMMARY_SEPARATOR = "\n\n---\n\n";

/**
 * Returns a compact context string built from the two most recent non-empty call
 * transcript summaries for a given lead. Summaries are ordered oldest → newest.
 *
 * If no suitable summaries exist, returns undefined so callers can omit the field.
 */
export async function getPreviousChatContext(
  companyId: string,
  leadId: string
): Promise<string | undefined> {
  const calls = await prisma.call.findMany({
    where: {
      companyId,
      leadId,
      transcript: { is: { summary: { not: null } } },
    },
    select: {
      endedAt: true,
      createdAt: true,
      transcript: { select: { summary: true } },
    },
    orderBy: [{ endedAt: "desc" }, { createdAt: "desc" }],
    take: 2,
  });

  const summariesNewestFirst = calls
    .map((c) => c.transcript?.summary ?? "")
    .map((s) => s.trim())
    .filter(Boolean);

  if (summariesNewestFirst.length === 0) return undefined;

  const summariesOldestFirst = summariesNewestFirst.slice().reverse();
  return summariesOldestFirst.join(SUMMARY_SEPARATOR);
}


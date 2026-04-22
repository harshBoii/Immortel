import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: Request) {
  const session = await getCallsSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const days = Math.max(
    1,
    Math.min(365, parseInt(url.searchParams.get("days") ?? "30", 10) || 30)
  );
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const calls = await prisma.call.findMany({
    where: { companyId: session.companyId, createdAt: { gte: since } },
    include: {
      lead: { select: { name: true, phone: true, email: true, city: true } },
      campaign: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "createdAt",
    "externalCallId",
    "direction",
    "status",
    "outcome",
    "sentiment",
    "durationSec",
    "costCents",
    "leadName",
    "leadPhone",
    "leadEmail",
    "leadCity",
    "campaign",
    "dropReason",
    "failureReason",
    "recordingUrl",
  ];

  const rows = calls.map((c) =>
    [
      c.createdAt.toISOString(),
      c.externalCallId,
      c.direction,
      c.status,
      c.outcome,
      c.sentiment,
      c.durationSec,
      c.costCents,
      c.lead?.name,
      c.lead?.phone,
      c.lead?.email,
      c.lead?.city,
      c.campaign?.name,
      c.dropReason,
      c.failureReason,
      c.recordingUrl,
    ]
      .map(csvEscape)
      .join(",")
  );

  const body = [header.join(","), ...rows].join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calls-report-${days}d.csv"`,
    },
  });
}

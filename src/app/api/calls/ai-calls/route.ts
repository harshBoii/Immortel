import { NextResponse } from "next/server";
import { Prisma, CallOutcome, CallStatus, Sentiment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCallsSession } from "@/lib/calls/session";

export async function GET(request: Request) {
  const session = await getCallsSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50)
  );
  const status = url.searchParams.get("status");
  const outcome = url.searchParams.get("outcome");
  const sentiment = url.searchParams.get("sentiment");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Prisma.CallWhereInput = {
    companyId: session.companyId,
    ...(status &&
      Object.values(CallStatus).includes(status as CallStatus) && {
        status: status as CallStatus,
      }),
    ...(outcome &&
      Object.values(CallOutcome).includes(outcome as CallOutcome) && {
        outcome: outcome as CallOutcome,
      }),
    ...(sentiment &&
      Object.values(Sentiment).includes(sentiment as Sentiment) && {
        sentiment: sentiment as Sentiment,
      }),
    ...(from && { createdAt: { gte: new Date(from) } }),
    ...(to && { createdAt: { lte: new Date(to) } }),
  };

  const [items, total] = await Promise.all([
    prisma.call.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lead: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.call.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

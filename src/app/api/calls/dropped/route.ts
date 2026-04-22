import { NextResponse } from "next/server";
import { Prisma, CallOutcome, CallStatus } from "@prisma/client";
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
  const filter = url.searchParams.get("filter"); // "short" | "noanswer" | "network"
  const dropReason = url.searchParams.get("dropReason");

  const baseWhere: Prisma.CallWhereInput = {
    companyId: session.companyId,
    OR: [
      { status: { in: [CallStatus.DROPPED, CallStatus.FAILED] } },
      { outcome: CallOutcome.NO_ANSWER },
    ],
  };

  const where: Prisma.CallWhereInput =
    filter === "noanswer"
      ? { companyId: session.companyId, outcome: CallOutcome.NO_ANSWER }
      : {
          ...baseWhere,
          ...(filter === "short" && { durationSec: { lt: 10 } }),
          ...(filter === "network" && {
            dropReason: { contains: "network", mode: "insensitive" },
          }),
          ...(dropReason && {
            dropReason: { contains: dropReason, mode: "insensitive" },
          }),
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

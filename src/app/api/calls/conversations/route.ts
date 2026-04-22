import { NextResponse } from "next/server";
import { Prisma, Channel, Sentiment } from "@prisma/client";
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
  const channel = url.searchParams.get("channel");
  const sentiment = url.searchParams.get("sentiment");
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: Prisma.ConversationWhereInput = {
    companyId: session.companyId,
    ...(channel &&
      Object.values(Channel).includes(channel as Channel) && {
        channel: channel as Channel,
      }),
    ...(sentiment &&
      Object.values(Sentiment).includes(sentiment as Sentiment) && {
        sentiment: sentiment as Sentiment,
      }),
    ...(search && {
      OR: [
        { summary: { contains: search, mode: "insensitive" } },
        { keywords: { has: search } },
        { lead: { name: { contains: search, mode: "insensitive" } } },
        { lead: { phone: { contains: search } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lead: { select: { id: true, name: true, phone: true } },
      },
    }),
    prisma.conversation.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function trimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const token = trimmedString(body.token);
  const ratingRaw = body.rating;
  const rating = typeof ratingRaw === "number" ? Math.floor(ratingRaw) : parseInt(String(ratingRaw), 10);
  const reason = trimmedString(body.reason);
  const text = trimmedString(body.text);

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  const now = new Date();
  const tokenRow = await (prisma as any).callFeedbackToken.findUnique({
    where: { token },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      companyId: true,
      leadId: true,
      callId: true,
    },
  });

  if (!tokenRow) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (tokenRow.usedAt) return NextResponse.json({ error: "This link was already used" }, { status: 410 });
  if (tokenRow.expiresAt.getTime() <= now.getTime()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Mark token used first (prevents double submit).
      await (tx as any).callFeedbackToken.update({
        where: { id: tokenRow.id },
        data: { usedAt: now },
      });

      await (tx as any).callFeedback.create({
        data: {
          companyId: tokenRow.companyId,
          leadId: tokenRow.leadId,
          callId: tokenRow.callId,
          rating,
          reason: reason || null,
          text: text || null,
        },
      });
    });
  } catch (err) {
    // If a second request races, the token usedAt update can conflict; surface as "already used".
    console.error("feedback/submit: failed", err);
    return NextResponse.json({ error: "Unable to submit feedback" }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  buildRivalAnalyzeMicroPayload,
  type InsightTopicInput,
} from "@/lib/geo/geoknight/buildRivalAnalyzeMicroPayload";

type FocusBody =
  | { kind: "self"; displayName: string }
  | { kind: "rival"; rivalCompanyId: string; displayName: string };

const MAX_INSIGHT_PROMPTS = 5;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const requesterCompanyId = session.companyId;
  const body = await req.json().catch(() => null);
  const focus = body?.focus as FocusBody | undefined;
  const topics = body?.topics as InsightTopicInput[] | undefined;

  if (!focus || (focus.kind !== "self" && focus.kind !== "rival")) {
    return NextResponse.json(
      { success: false, error: "focus.kind must be \"self\" or \"rival\"" },
      { status: 400 }
    );
  }
  if (focus.kind === "rival" && !String(focus.rivalCompanyId ?? "").trim()) {
    return NextResponse.json(
      { success: false, error: "focus.rivalCompanyId is required for rival focus" },
      { status: 400 }
    );
  }
  if (!Array.isArray(topics) || topics.length === 0) {
    return NextResponse.json(
      { success: false, error: "topics must be a non-empty list" },
      { status: 400 }
    );
  }

  let rivalCompanyId: string | null = null;
  if (focus.kind === "rival") {
    rivalCompanyId = String(focus.rivalCompanyId).trim();
    const allowed = await prisma.companyRival.findUnique({
      where: {
        companyId_rivalCompanyId: {
          companyId: requesterCompanyId,
          rivalCompanyId,
        },
      },
      select: { id: true },
    });
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const base = process.env.MICROSERVICE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured" },
      { status: 500 }
    );
  }

  const focusName = String(focus.displayName ?? "").trim();
  const microPayload = buildRivalAnalyzeMicroPayload(topics, focusName, MAX_INSIGHT_PROMPTS);

  const promptCount = Object.values(microPayload).reduce((s, t) => s + t.prompts.length, 0);
  if (promptCount === 0) {
    return NextResponse.json(
      { success: false, error: "No prompts available to analyze after filtering." },
      { status: 400 }
    );
  }

  console.log(
    "[geo/geoknight/rival-insight] microservice /rival/analyze request body:",
    JSON.stringify(microPayload, null, 2)
  );

  const url = `${base.replace(/\/+$/, "")}/rival/analyze`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(microPayload),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Rival analyze microservice failed",
          status: res.status,
          body: json,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, result: json });
  } catch (err) {
    console.error("[geo/geoknight/rival-insight] microservice error:", err);
    return NextResponse.json(
      { success: false, error: "Error contacting microservice", details: (err as Error).message },
      { status: 502 }
    );
  }
}

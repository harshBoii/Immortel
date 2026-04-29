import { NextResponse } from "next/server";
import {
  heygenFetchJson,
  normalizeHeygenVoices,
  requireCompanySession,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    await requireCompanySession();

    const payload = await heygenFetchJson<unknown>("/v2/voices", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    return NextResponse.json({
      ok: true,
      voices: normalizeHeygenVoices(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load voices";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}


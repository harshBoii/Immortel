import { NextResponse } from "next/server";
import {
  heygenFetchJson,
  normalizeHeygenAvatars,
  requireCompanySession,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  try {
    await requireCompanySession();

    const payload = await heygenFetchJson<unknown>("/v2/avatars", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    return NextResponse.json({
      ok: true,
      avatars: normalizeHeygenAvatars(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load avatars";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}


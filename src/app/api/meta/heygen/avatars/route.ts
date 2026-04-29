import { NextResponse } from "next/server";
import {
  heygenFetchJson,
  normalizeHeygenAvatars,
  requireCompanySession,
} from "@/lib/heygen/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await requireCompanySession();

    const url = new URL(request.url);
    const ownership = url.searchParams.get("ownership"); // public | private | null
    const limit = url.searchParams.get("limit");
    const token = url.searchParams.get("token");

    const apiUrl = new URL("https://api.heygen.com/v3/avatars");
    if (ownership) apiUrl.searchParams.set("ownership", ownership);
    if (limit) apiUrl.searchParams.set("limit", limit);
    if (token) apiUrl.searchParams.set("token", token);

    const payload = await heygenFetchJson<unknown>(`${apiUrl.pathname}${apiUrl.search}`, {
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


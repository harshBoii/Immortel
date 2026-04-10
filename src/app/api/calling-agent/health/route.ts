import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const CALLING_AGENT_BASE = "https://calling-agent-ki3j.onrender.com";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${CALLING_AGENT_BASE}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(
      {
        success: res.ok,
        status: res.status,
        data,
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to reach calling agent service" },
      { status: 502 }
    );
  }
}

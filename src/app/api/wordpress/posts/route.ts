import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { wpSafeFetch } from "@/lib/wordpress/client";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "10";

  try {
    const result = await wpSafeFetch(session.companyId, (wp) =>
      wp.getPosts({ page, per_page: perPage })
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "WP_NOT_CONNECTED") {
      return NextResponse.json({ error: "WordPress not connected" }, { status: 404 });
    }
    if (msg === "WP_UNAUTHORIZED") {
      return NextResponse.json({ error: "Reconnect required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type GraphNode = { id: string; name: string };
type GraphListResponse = {
  data?: GraphNode[];
  error?: { message?: string; type?: string; code?: number };
};

async function fetchAll(path: string, accessToken: string): Promise<GraphNode[]> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("limit", "200");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as GraphListResponse;

  if (!res.ok || json.error) {
    const message = json.error?.message ?? `Graph API error (${res.status})`;
    throw new Error(message);
  }

  return (json.data ?? []).map((n) => ({ id: n.id, name: n.name }));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { accessToken?: unknown } | null;
  const token = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
  }

  try {
    const [adAccounts, pages] = await Promise.all([
      fetchAll("/me/adaccounts", token),
      fetchAll("/me/accounts", token),
    ]);

    return NextResponse.json({ adAccounts, pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch from Meta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

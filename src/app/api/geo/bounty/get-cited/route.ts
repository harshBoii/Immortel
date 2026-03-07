import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json({ success: false, error: "query is required" }, { status: 400 });
  }

  const companyId = session.companyId;

  const bounty = await prisma.citationBounty.create({
    data: {
      companyId,
      query,
      pageType: "USE_CASE",
      confidence: 50,
      status: "OPEN",
    },
    select: { id: true },
  });

  const origin = request.nextUrl.origin;
  const huntUrl = `${origin}/api/geo/bounty/${bounty.id}/hunt`;

  try {
    const huntRes = await fetch(huntUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const huntData = await huntRes.json();

    if (!huntRes.ok || !huntData?.success) {
      return NextResponse.json(
        {
          success: false,
          error: huntData?.error ?? "Hunt failed",
          bountyId: bounty.id,
        },
        { status: huntRes.status >= 400 ? huntRes.status : 502 }
      );
    }

    return NextResponse.json({
      success: true,
      bountyId: bounty.id,
      aeoPageId: huntData.aeoPageId ?? null,
    });
  } catch (err) {
    console.error("Get cited hunt request failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run hunt",
        bountyId: bounty.id,
      },
      { status: 502 }
    );
  }
}

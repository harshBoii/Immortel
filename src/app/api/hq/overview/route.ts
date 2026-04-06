import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertHqDashboardAccess, resolveHqCompanyFilter } from "@/lib/auth/companyAccess";
import { loadHqOverviewData } from "@/lib/hq/loadHqOverviewData";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const access = await assertHqDashboardAccess(session.companyId);
    const url = new URL(request.url);
    const raw = url.searchParams.get("companies");
    const requested = raw
      ? raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    const allowedIds = [...new Set(access.companyIds)];
    const activeCompanyIds = [
      ...new Set(resolveHqCompanyFilter(allowedIds, requested)),
    ];

    const overview = await loadHqOverviewData(activeCompanyIds, access.organizationName);

    return NextResponse.json(
      {
        success: true,
        organizationName: access.organizationName,
        organizationId: access.organizationId,
        companies: access.companies,
        allowedCompanyIds: allowedIds,
        activeCompanyIds,
        ...overview,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, must-revalidate",
        },
      }
    );
  } catch (e) {
    if (e instanceof Error && e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("HQ overview error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

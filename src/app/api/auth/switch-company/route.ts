import { NextResponse } from "next/server";
import { getSession, setAuthCookie } from "@/lib/auth";
import { assertCanAccessCompanyId } from "@/lib/auth/companyAccess";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.companyId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const targetId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
    if (!targetId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    try {
      await assertCanAccessCompanyId(session.companyId, targetId);
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await setAuthCookie(targetId);

    return NextResponse.json({
      success: true,
      redirect: "/",
    });
  } catch (err) {
    console.error("switch-company error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

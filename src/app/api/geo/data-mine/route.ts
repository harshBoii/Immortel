import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadSerializedDataMineForCompany } from "@/lib/geo/dataMinePayload";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const payload = await loadSerializedDataMineForCompany(session.companyId);
  return NextResponse.json({ success: true, ...payload });
}

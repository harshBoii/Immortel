import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const metaIntegrationId =
      typeof body?.meta_integration_id === "string" ? body.meta_integration_id : null;
    const companyId = typeof body?.company_id === "string" ? body.company_id : null;
    const winningFormula = body?.winningFormula ?? null;

    if (!metaIntegrationId || !companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing meta_integration_id or company_id" },
        { status: 400 },
      );
    }

    // asset_id + meta_id are included in the contract for direct persistence/routing.
    // We don't need them for the MetaIntegration write, but we accept them for compatibility.
    await prisma.metaIntegration.updateMany({
      where: { id: metaIntegrationId, companyId },
      data: {
        winningFormula,
        winningFormulaBuiltAt: body?.generated_at ? new Date(body.generated_at) : new Date(),
      } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/meta/crypto";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    accessToken?: unknown;
    adAccountId?: unknown;
    fbPageId?: unknown;
  } | null;

  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const adAccountId = typeof body?.adAccountId === "string" ? body.adAccountId.trim() : "";
  const fbPageId = typeof body?.fbPageId === "string" ? body.fbPageId.trim() : "";

  if (!accessToken) return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
  if (!adAccountId) return NextResponse.json({ error: "adAccountId is required" }, { status: 400 });
  if (!fbPageId) return NextResponse.json({ error: "fbPageId is required" }, { status: 400 });

  let encryptedToken: string;
  try {
    encryptedToken = encrypt(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Encryption failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    await prisma.metaIntegration.upsert({
      where: { companyId: session.companyId },
      create: {
        companyId: session.companyId,
        accessToken: encryptedToken,
        adAccountId,
        fbPageId,
      },
      update: {
        accessToken: encryptedToken,
        adAccountId,
        fbPageId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save integration";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

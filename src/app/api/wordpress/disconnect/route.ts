import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function disconnect(companyId: string) {
  await prisma.wordPressIntegration.update({
    where: { tenantId: companyId },
    data: { status: "disconnected" },
  });
}

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await disconnect(session.companyId);
  } catch {
    // If there's no row yet, treat as already disconnected.
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  return POST();
}


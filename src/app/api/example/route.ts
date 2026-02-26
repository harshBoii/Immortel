import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.asset.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.example.findMany();
  return NextResponse.json(items);
}

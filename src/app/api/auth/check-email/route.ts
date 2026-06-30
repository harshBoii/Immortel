import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.email !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailNormalized = body.email.trim().toLowerCase();
  const existing = await prisma.company.findUnique({
    where: { email: emailNormalized },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      {
        available: false,
        error: "This email is already registered",
        code: "EMAIL_EXISTS",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ available: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Organization username and password are required" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { username: username.toLowerCase() },
      include: {
        companies: {
          select: { id: true, isOrg: true, name: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!org?.password) {
      return NextResponse.json(
        { error: "Invalid organization credentials" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, org.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid organization credentials" },
        { status: 401 }
      );
    }

    if (org.companies.length === 0) {
      return NextResponse.json(
        { error: "No companies linked to this organization" },
        { status: 403 }
      );
    }

    const hq =
      org.companies.find((c) => c.isOrg) ?? org.companies[0] ?? null;
    if (!hq) {
      return NextResponse.json({ error: "No company to attach session" }, { status: 403 });
    }

    await setAuthCookie(hq.id);

    /** Org login always lands on HQ; overview API allows single- or multi-company orgs. */
    const redirect = "/hq";

    return NextResponse.json({
      success: true,
      redirect,
    });
  } catch (err) {
    console.error("Organization login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

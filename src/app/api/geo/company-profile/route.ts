import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const company = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { id: true, name: true, description: true, logoUrl: true, website: true, email: true },
  });
  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, company });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }
  const { description, logoUrl, website, email } = body as {
    description?: string | null;
    logoUrl?: string | null;
    website?: string | null;
    email?: string | null;
  };
  const data: { description?: string; logoUrl?: string; website?: string; email?: string } = {};
  if (description !== undefined) data.description = description == null ? "" : String(description).trim() || null;
  if (logoUrl !== undefined) data.logoUrl = logoUrl == null ? "" : String(logoUrl).trim() || null;
  if (website !== undefined) data.website = website == null ? "" : String(website).trim() || null;
  if (email !== undefined) {
    const e = String(email).trim();
    if (!e) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }
    data.email = e;
  }
  const company = await prisma.company.update({
    where: { id: session.companyId },
    data,
    select: { id: true, name: true, description: true, logoUrl: true, website: true, email: true },
  });
  return NextResponse.json({ success: true, company });
}

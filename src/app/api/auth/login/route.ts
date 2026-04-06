import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        organization: {
          select: { _count: { select: { companies: true } } },
        },
      },
    });

    if (!company || !company.password) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, company.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await setAuthCookie(company.id);

    const goHq =
      company.organizationId != null &&
      (company.organization?._count.companies ?? 0) >= 1;

    return NextResponse.json({
      success: true,
      redirect: goHq ? "/hq" : "/",
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

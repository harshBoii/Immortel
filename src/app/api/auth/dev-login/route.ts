import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!company) {
      return NextResponse.json({ error: 'No company found for that email' }, { status: 401 });
    }

    await setAuthCookie(company.id);

    return NextResponse.json({
      success: true,
      redirect: '/',
    });
  } catch (err) {
    console.error('Dev login error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

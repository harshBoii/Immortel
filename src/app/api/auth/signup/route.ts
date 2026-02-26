import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, workspaceType } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const emailNormalized = email.trim().toLowerCase();
    const existing = await prisma.company.findUnique({
      where: { email: emailNormalized },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered', code: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 0;
    while (true) {
      const exists = await prisma.company.findUnique({ where: { slug } });
      if (!exists) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        slug,
        email: emailNormalized,
        userName: emailNormalized,
        password: hashedPassword,
      },
    });

    await setAuthCookie(company.id);

    return NextResponse.json({
      success: true,
      redirect: '/',
    });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}

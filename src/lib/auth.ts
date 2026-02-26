type Employee = {
  id: string;
  email: string;
};

type VerifyJWTResult =
  | { employee: Employee; error: null }
  | { employee: null; error: string };

export async function verifyJWT(request: Request): Promise<VerifyJWTResult> {
  const id = request.headers.get("x-employee-id");
  const email = request.headers.get("x-employee-email");

  if (!id || !email) {
    return { employee: null, error: "Unauthorized" };
  }

  return {
    employee: { id, email },
    error: null,
  };
}

import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET must be set and at least 16 characters');
  }
  return secret;
}

function sign(value: string): string {
  const secret = getSecret();
  const hmac = createHmac('sha256', secret);
  hmac.update(value);
  return hmac.digest('hex');
}

export function createAuthCookie(companyId: string): string {
  const payload = `${companyId}.${Date.now()}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyAuthCookie(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const parts = cookieValue.split('.');
  if (parts.length < 3) return null;
  const signature = parts.pop()!;
  const payload = parts.join('.');
  const expected = sign(payload);
  try {
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return null;
    }
  } catch {
    return null;
  }
  const companyId = parts[0];
  return companyId || null;
}

export async function getSession(): Promise<{ companyId: string } | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  const companyId = verifyAuthCookie(cookie?.value);
  if (!companyId) return null;
  return { companyId };
}

export async function setAuthCookie(companyId: string): Promise<string> {
  const value = createAuthCookie(companyId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return value;
}

export async function deleteAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };

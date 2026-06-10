import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'smart-kirana-jwt-secret-dev-2024';
const COOKIE_NAME = 'kirana_token';

export function generateToken(merchantId: string): string {
  return jwt.sign({ merchantId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { merchantId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { merchantId: string };
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export function getAuthCookie(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function getMerchantIdFromRequest(): string | null {
  const token = getAuthCookie();
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.merchantId || null;
}

// Check if merchantId is a valid MongoDB ObjectId (i.e., can be used with DB queries)
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// In-memory OTP store (dev only)
const otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

export function generateOTP(phone: string): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, {
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });
  return otp;
}

export function verifyOTP(phone: string, otp: string): boolean {
  const stored = otpStore.get(phone);
  if (!stored) return false;
  if (new Date() > stored.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  if (stored.otp !== otp) return false;
  otpStore.delete(phone);
  return true;
}

// Auth: bcrypt password + jose JWT in httpOnly cookie (§10, §89)
// Ponytail: no NextAuth/Clerk — 2 deps (bcryptjs + jose), full control, no vendor lock-in.

import * as bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "closer_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET missing or too short (>=16 chars)");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export type SessionPayload = { userId: string; email: string; orgId?: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new jose.SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && (process.env.APP_URL?.startsWith("https://") ?? false),
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("Unauthorized");
  return s;
}

// Fetch current user's org memberships (for org switcher / tenant isolation)
export async function getMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
  });
}

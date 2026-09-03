import { NextResponse, type NextRequest } from "next/server";
import * as jose from "jose";

const PUBLIC = [
  "/",
  "/login",
  "/register",
  "/extension",
  "/extension.zip",
  "/downloads",
  "/manifest.json",
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
  "/api/ready",
  "/api/webhooks/inbound",
];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get("closer_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.next();
  try {
    await jose.jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

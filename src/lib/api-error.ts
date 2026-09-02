import { NextResponse } from "next/server";
// Additive helper — don't churn 40 handlers. Use in new code.
export function apiError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}
export function tooMany(retriedAfterMs: number) {
  const sec = Math.ceil(retriedAfterMs / 1000);
  return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(sec) } });
}

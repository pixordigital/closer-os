import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { tooMany } from "@/lib/api-error";

export async function POST(req: Request) {
  const rl = checkRateLimit(`auth:login:${getClientIp(req)}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok) return tooMany(rl.retryAfterMs);
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { email, password, remember } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
  }
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  await setSessionCookie({ userId: user.id, email: user.email, orgId: membership?.organizationId }, { remember: !!remember });
  if (membership) await auditLog({ organizationId: membership.organizationId, userId: user.id, action: "user.login" });
  return NextResponse.json({ ok: true });
}

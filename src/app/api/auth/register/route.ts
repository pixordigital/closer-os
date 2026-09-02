import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, orgName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

  const passwordHash = await hashPassword(password);

  // Create user + default org in transaction
  const rawOrg = orgName?.trim() || `${name.split(" ")[0]}'s Org`;
  let slug = slugify(rawOrg);
  // ensure unique slug
  let attempt = slug;
  for (let i = 0; i < 10; i++) {
    const exists = await prisma.organization.findUnique({ where: { slug: attempt } });
    if (!exists) { slug = attempt; break; }
    attempt = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name, email, passwordHash } });
    const org = await tx.organization.create({ data: { name: rawOrg, slug } });
    await tx.membership.create({ data: { userId: u.id, organizationId: org.id, role: "OWNER" } });
    return u;
  });

  // fetch org for session
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });

  await setSessionCookie({ userId: user.id, email, orgId: membership?.organizationId });
  if (membership) await auditLog({ organizationId: membership.organizationId, userId: user.id, action: "user.register" });

  return NextResponse.json({ ok: true, userId: user.id });
}

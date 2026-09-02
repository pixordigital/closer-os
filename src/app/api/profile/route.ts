import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { profilePatchSchema } from "@/lib/validations/profile";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const { userId } = await requireTenant();
  const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
  return NextResponse.json(profile ?? { userId, strengths: [], weaknesses: [] });
}

export async function PATCH(req: Request) {
  const { userId, organizationId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = profilePatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // ensure org membership exists
  const mem = await prisma.membership.findFirst({ where: { userId, organizationId }, select: { organizationId: true } });
  if (!mem) return NextResponse.json({ error: "No organization" }, { status: 403 });
  const profile = await prisma.sellerProfile.upsert({
    where: { userId },
    update: { ...parsed.data } as never,
    create: { userId, organizationId, ...parsed.data } as never,
  });
  await auditLog({ organizationId, userId, action: "profile.updated", entityType: "SellerProfile", entityId: profile.id });
  return NextResponse.json(profile);
}

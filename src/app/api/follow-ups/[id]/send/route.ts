import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { auditLog } from "@/lib/audit";
import { getIntegration } from "@/lib/integrations/registry";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const f = await prisma.followUp.findFirst({ where: { id, organizationId }, include: { deal: { include: { primaryContact: true } } } });
  if (!f) return NextResponse.json({ error: "FollowUp not found" }, { status: 404 });
  if (f.status !== "APPROVED") return NextResponse.json({ error: "Only APPROVED can be sent" }, { status: 400 });
  const deal = f.deal as unknown as { primaryContact: { email: string | null } | null } | null;
  const to = deal?.primaryContact?.email;
  if (!to) return NextResponse.json({ error: "Deal sem contato com email" }, { status: 400 });
  const conn = await prisma.integrationConnection.findFirst({ where: { organizationId, kind: "email", status: "connected" }, orderBy: { updatedAt: "desc" } });
  const providerName = conn?.provider ?? "mock-email";
  const cfg = (conn?.config as Record<string, unknown>) ?? {};
  try {
    const p = getIntegration(providerName);
    if (!p.sendEmail) throw new Error(`provider ${providerName} no sendEmail`);
    await p.sendEmail(cfg, { to, subject: f.subject ?? "Follow-up", html: f.content });
  } catch (e) { return NextResponse.json({ error: String(e).slice(0, 500) }, { status: 502 }); }
  const updated = await prisma.followUp.update({ where: { id }, data: { status: "SENT" as never } });
  await auditLog({ organizationId, userId, action: "followup.sent", entityType: "FollowUp", entityId: id, metadata: { to } as never });
  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";

const patchSchema = z.object({
  subject: z.string().max(160).nullable().optional(),
  content: z.string().min(1).max(8000).optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "APPROVED", "SENT", "CANCELLED"]).optional(),
});

async function getScoped(id: string, organizationId: string) {
  const f = await prisma.followUp.findFirst({ where: { id, organizationId } });
  if (!f) throw Object.assign(new Error("FollowUp not found"), { status: 404 });
  return f;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const f = await getScoped(id, organizationId);
    return NextResponse.json(f);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScoped(id, organizationId);
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const updated = await prisma.followUp.update({ where: { id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action: "followup.updated", entityType: "FollowUp", entityId: id, metadata: parsed.data as never });
    if (parsed.data.status === "APPROVED") {
      fireTriggers({ organizationId, event: "followup.approved", payload: { id, dealId: updated.dealId, callId: updated.callId, status: updated.status }, idempotencyKey: `followup.approved:${id}` });
    } else if (parsed.data.status) {
      fireTriggers({ organizationId, event: "followup.created", payload: { id, dealId: updated.dealId, callId: updated.callId, status: updated.status }, idempotencyKey: `followup.${parsed.data.status.toLowerCase()}:${id}` });
    }
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

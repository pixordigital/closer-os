import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { transcriptUpsertSchema } from "@/lib/validations/call";
import { auditLog } from "@/lib/audit";

async function getScopedCall(id: string, organizationId: string) {
  const c = await prisma.call.findFirst({ where: { id, organizationId } });
  if (!c) throw Object.assign(new Error("Call not found"), { status: 404 });
  return c;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    await getScopedCall(id, organizationId);
    const t = await prisma.transcript.findUnique({ where: { callId: id } });
    if (!t) return NextResponse.json({ callId: id, content: null });
    return NextResponse.json(t);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScopedCall(id, organizationId);
    const body = await req.json().catch(() => null);
    const parsed = transcriptUpsertSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const t = await prisma.transcript.upsert({
      where: { callId: id },
      create: { callId: id, ...parsed.data } as never,
      update: { ...parsed.data } as never,
    });
    await auditLog({ organizationId, userId, action: "call.transcript_upserted", entityType: "Call", entityId: id });
    return NextResponse.json(t);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await getScopedCall(id, organizationId);
    await prisma.transcript.delete({ where: { callId: id } }).catch(() => {});
    await auditLog({ organizationId, userId, action: "call.transcript_deleted", entityType: "Call", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

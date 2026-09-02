import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getDiscoveryWithHealth } from "@/lib/discovery";
import { discoveryBatchPatchSchema, discoveryFieldPatchSchema } from "@/lib/validations/discovery";
import { auditLog } from "@/lib/audit";

async function assertDeal(id: string, organizationId: string) {
  const d = await prisma.deal.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!d) throw Object.assign(new Error("Deal not found"), { status: 404 });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    await assertDeal(id, organizationId);
    const { fields, health } = await getDiscoveryWithHealth(id);
    return NextResponse.json({ fields, health });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    await assertDeal(id, organizationId);
    const body = await req.json().catch(() => null);

    // Accept either { key, status, value, ... } single or { fields: [...] } batch
    const batchParsed = discoveryBatchPatchSchema.safeParse(body);
    if (batchParsed.success) {
      for (const f of batchParsed.data.fields) {
        const data: Record<string, unknown> = {};
        if (f.status !== undefined) data.status = f.status;
        if (f.value !== undefined) data.value = f.value;
        if (f.confidence !== undefined) data.confidence = f.confidence;
        if (f.source !== undefined) data.source = f.source;
        await prisma.discoveryField.upsert({
          where: { dealId_key: { dealId: id, key: f.key } },
          create: { dealId: id, key: f.key, status: (f.status as never) ?? "UNKNOWN", value: (f.value as never) ?? null, confidence: f.confidence ?? null, source: (f.source as never) ?? "USER" },
          update: data,
        });
      }
      const { fields, health } = await getDiscoveryWithHealth(id);
      await auditLog({ organizationId, userId, action: "discovery.updated", entityType: "Deal", entityId: id, metadata: { count: batchParsed.data.fields.length, health } });
      return NextResponse.json({ fields, health });
    }

    const single = discoveryFieldPatchSchema.safeParse(body);
    if (!single.success) return NextResponse.json({ error: single.error.flatten() }, { status: 400 });
    const f = single.data;
    const data: Record<string, unknown> = {};
    if (f.status !== undefined) data.status = f.status;
    if (f.value !== undefined) data.value = f.value;
    if (f.confidence !== undefined) data.confidence = f.confidence;
    if (f.source !== undefined) data.source = f.source;
    await prisma.discoveryField.upsert({
      where: { dealId_key: { dealId: id, key: f.key } },
      create: { dealId: id, key: f.key, status: (f.status as never) ?? "UNKNOWN", value: (f.value as never) ?? null, confidence: f.confidence ?? null, source: (f.source as never) ?? "USER" },
      update: data,
    });
    const { fields, health } = await getDiscoveryWithHealth(id);
    await auditLog({ organizationId, userId, action: "discovery.updated", entityType: "Deal", entityId: id, metadata: { key: f.key, health } });
    return NextResponse.json({ fields, health });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

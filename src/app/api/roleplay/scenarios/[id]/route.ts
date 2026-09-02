import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { scenarioUpdateSchema } from "@/lib/validations/roleplay";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, organizationId: string) {
  const s = await prisma.roleplayScenario.findFirst({
    where: { id, OR: [{ organizationId }, { organizationId: null }] },
  });
  if (!s) throw Object.assign(new Error("Scenario not found"), { status: 404 });
  // only org-owned can be edited/deleted; global templates read-only
  const owned = (s as { organizationId: string | null }).organizationId === organizationId;
  return { s, owned };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const { s } = await getScoped(id, organizationId);
    // hide hiddenContext for seller view? Keep full here — session route strips it; detail needs it for owner edit
    return NextResponse.json(s);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    const { owned } = await getScoped(id, organizationId);
    if (!owned) return NextResponse.json({ error: "Cannot edit global template" }, { status: 403 });
    const body = await req.json().catch(() => null);
    const parsed = scenarioUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const updated = await prisma.roleplayScenario.update({ where: { id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action: "roleplay.scenario_updated", entityType: "RoleplayScenario", entityId: id });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  try {
    const { owned } = await getScoped(id, organizationId);
    if (!owned) return NextResponse.json({ error: "Cannot delete global template" }, { status: 403 });
    await prisma.roleplayScenario.delete({ where: { id } });
    await auditLog({ organizationId, userId, action: "roleplay.scenario_deleted", entityType: "RoleplayScenario", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

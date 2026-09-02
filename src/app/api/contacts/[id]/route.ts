import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { contactUpdateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, organizationId: string) {
  const c = await prisma.contact.findFirst({ where: { id, organizationId } });
  if (!c) throw Object.assign(new Error("Not found"), { status: 404 });
  return c;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const contact = await getScoped(id, organizationId);
    const company = await prisma.company.findUnique({ where: { id: contact.companyId }, select: { id: true, name: true } });
    return NextResponse.json({ ...contact, company });
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
    const parsed = contactUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    if (parsed.data.companyId) {
      const company = await prisma.company.findFirst({ where: { id: parsed.data.companyId, organizationId } });
      if (!company) return NextResponse.json({ error: "Company not found in organization" }, { status: 404 });
    }
    const updated = await prisma.contact.update({ where: { id }, data: parsed.data });
    await auditLog({ organizationId, userId, action: "contact.updated", entityType: "Contact", entityId: id });
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
    await getScoped(id, organizationId);
    await prisma.contact.delete({ where: { id } });
    await auditLog({ organizationId, userId, action: "contact.deleted", entityType: "Contact", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

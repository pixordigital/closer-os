import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { companyUpdateSchema } from "@/lib/validations/crm";
import { auditLog } from "@/lib/audit";

async function getScoped(id: string, organizationId: string) {
  const c = await prisma.company.findFirst({ where: { id, organizationId } });
  if (!c) throw Object.assign(new Error("Not found"), { status: 404 });
  return c;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  try {
    const company = await getScoped(id, organizationId);
    const [contacts, deals] = await Promise.all([
      prisma.contact.findMany({ where: { companyId: id, organizationId } }),
      prisma.deal.findMany({ where: { companyId: id, organizationId }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return NextResponse.json({ ...company, contacts, deals });
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
    const parsed = companyUpdateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const cnpjDigits = (parsed.data as { cnpj?: string }).cnpj?.replace(/\D/g, "") || undefined;
    if (cnpjDigits) {
      const dupCnpj = await prisma.company.findFirst({ where: { organizationId, cnpj: cnpjDigits, id: { not: id } } as never, select: { id: true } });
      if (dupCnpj) return NextResponse.json({ error: "CNPJ já cadastrado", existingId: dupCnpj.id }, { status: 409 });
      (parsed.data as Record<string, unknown>).cnpj = cnpjDigits;
    }
    if ((parsed.data as { name?: string }).name) {
      const dup = await prisma.company.findFirst({ where:{ organizationId, name:{ equals:(parsed.data as {name:string}).name, mode:"insensitive" as const }, id:{ not:id } }, select:{ id:true } });
      if (dup) return NextResponse.json({ error:"Empresa já existe nesta organização", existingId: dup.id }, { status:409 });
    }
    const updated = await prisma.company.update({ where: { id }, data: parsed.data as never });
    await auditLog({ organizationId, userId, action: "company.updated", entityType: "Company", entityId: id });
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
    await prisma.company.delete({ where: { id } });
    await auditLog({ organizationId, userId, action: "company.deleted", entityType: "Company", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}

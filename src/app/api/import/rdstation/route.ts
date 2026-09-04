import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { getIntegration } from "@/lib/integrations/registry";

export async function POST(req: Request) {
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(() => null) as { limit?: number } | null;
  const conn = await prisma.integrationConnection.findFirst({ where: { organizationId, provider: "rdstation" } });
  if (!conn) return NextResponse.json({ error: "RD Station não conectado — configure em /integrations" }, { status: 400 });
  const prov = getIntegration("rdstation") as unknown as { importContacts: (cfg: unknown, opts?: unknown) => Promise<Array<{ name: string; email: string; company?: string; phone?: string }>> };
  const contacts = await prov.importContacts(conn.config as never, { limit: body?.limit ?? 50 });
  let created = 0;
  for (const c of contacts) {
    let companyId: string | undefined;
    if (c.company) {
      let comp = await prisma.company.findFirst({ where: { organizationId, name: c.company } });
      if (!comp) comp = await prisma.company.create({ data: { organizationId, name: c.company } as never });
      companyId = comp.id;
    }
    if (!companyId) continue;
    const exists = c.email ? await prisma.contact.findFirst({ where: { organizationId, email: c.email } }) : null;
    if (exists) continue;
    await prisma.contact.create({ data: { organizationId, companyId, name: c.name, email: c.email, phone: c.phone } as never });
    created++;
  }
  return NextResponse.json({ imported: contacts.length, created });
}
export async function GET() {
  const { organizationId } = await requireTenant();
  const conn = await prisma.integrationConnection.findFirst({ where: { organizationId, provider: "rdstation" } });
  if (!conn) return NextResponse.json({ connected: false });
  const prov = getIntegration("rdstation");
  const v = await prov.verify!(conn.config as never);
  return NextResponse.json({ connected: v.ok, message: v.message });
}

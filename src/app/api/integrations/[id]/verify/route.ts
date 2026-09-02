import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { getIntegration } from "@/lib/integrations/registry";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const row = await prisma.integrationConnection.findFirst({ where: { id, organizationId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const provider = getIntegration(row.provider);
  if (!provider.verify) return NextResponse.json({ ok: true, message: "no verify needed" });
  const res = await provider.verify((row.config as Record<string, unknown>) ?? {});
  if (!res.ok) {
    await prisma.integrationConnection.update({ where: { id }, data: { status: "error" } as never }).catch(() => {});
    return NextResponse.json({ ok: false, message: res.message }, { status: 400 });
  }
  await prisma.integrationConnection.update({ where: { id }, data: { status: "connected" } as never }).catch(() => {});
  return NextResponse.json({ ok: true, message: res.message ?? "connected" });
}

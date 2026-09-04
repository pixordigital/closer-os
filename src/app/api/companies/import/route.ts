import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { auditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = (await req.json().catch(() => null)) as {
    rows?: { name: string; website?: string; industry?: string }[];
  } | null;
  const rows = body?.rows ?? [];
  if (!rows.length) return NextResponse.json({ error: "Nenhuma linha" }, { status: 400 });
  let created = 0;
  let skipped = 0;
  for (const r of rows.slice(0, 500)) {
    const name = r.name?.trim();
    if (!name) {
      skipped++;
      continue;
    }
    const exists = await prisma.company.findFirst({
      where: { organizationId, name: { equals: name, mode: "insensitive" as const } },
    });
    if (exists) {
      skipped++;
      continue;
    }
    await prisma.company.create({
      data: { organizationId, name, website: r.website?.trim() || undefined, industry: r.industry?.trim() || undefined },
    });
    created++;
  }
  await auditLog({ organizationId, userId, action: "company.import", entityType: "Company", metadata: { created, skipped } as never });
  return NextResponse.json({ created, skipped });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { scenarioCreateSchema } from "@/lib/validations/roleplay";
import { auditLog } from "@/lib/audit";

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip, q } = parsePagination(url);
  const difficulty = url.searchParams.get("difficulty")?.trim().toUpperCase() || undefined;

  const where: Record<string, unknown> = {
    OR: [{ organizationId }, { organizationId: null }],
    ...(difficulty ? { difficulty } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { publicContext: { contains: q, mode: "insensitive" } }] } : {}),
  };
  // if q present, need to keep org filter — merge ORs: prisma doesn't allow duplicate OR keys, so build array
  let prismaWhere: Record<string, unknown>;
  if (q) {
    prismaWhere = {
      AND: [
        { OR: [{ organizationId }, { organizationId: null }] },
        { ...(difficulty ? { difficulty } : {}) },
        { OR: [{ title: { contains: q, mode: "insensitive" } }, { publicContext: { contains: q, mode: "insensitive" } }] },
      ],
    };
  } else {
    prismaWhere = {
      OR: [{ organizationId }, { organizationId: null }],
      ...(difficulty ? { difficulty } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.roleplayScenario.findMany({ where: prismaWhere as never, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.roleplayScenario.count({ where: prismaWhere as never }),
  ]);

  // ponytail: hide hiddenContext from list (seller shouldn't see) — expose only on session start/eval; keep here stripped for brevity
  const stripped = items.map(({ hiddenContext, ...rest }) => rest);
  return NextResponse.json({ items: stripped, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = scenarioCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const scenario = await prisma.roleplayScenario.create({
    data: { organizationId, ...parsed.data } as never,
  });
  await auditLog({ organizationId, userId, action: "roleplay.scenario_created", entityType: "RoleplayScenario", entityId: scenario.id });
  return NextResponse.json(scenario, { status: 201 });
}

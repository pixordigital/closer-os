import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { sessionCreateSchema } from "@/lib/validations/roleplay";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";

export async function GET(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const url = new URL(req.url);
  const { page, limit, skip } = parsePagination(url);
  const status = url.searchParams.get("status")?.trim().toUpperCase() || undefined;
  const where: Record<string, unknown> = {
    organizationId, userId,
    ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.roleplaySession.findMany({
      where: where as never,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { scenario: { select: { id: true, title: true, persona: true, difficulty: true } }, evaluation: { select: { overallScore: true } } },
    }),
    prisma.roleplaySession.count({ where: where as never }),
  ]);
  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = sessionCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const scenario = await prisma.roleplayScenario.findFirst({
    where: { id: parsed.data.scenarioId, OR: [{ organizationId }, { organizationId: null }] },
  });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const session = await prisma.roleplaySession.create({
    data: { organizationId, userId, scenarioId: scenario.id, objective: parsed.data.objective ?? null, status: "ACTIVE" as never } as never,
    include: { scenario: true },
  });

  // seed first prospect message (greeting) — lazy: via mock/AI or static
  await prisma.roleplayMessage.create({
    data: { sessionId: session.id, speaker: "PROSPECT" as never, content: `Olá, sou ${scenario.persona}. ${scenario.publicContext.slice(0, 200)} Me conta — o que você quer entender hoje?` } as never,
  });

  await auditLog({ organizationId, userId, action: "roleplay.started", entityType: "RoleplaySession", entityId: session.id });
  fireTriggers({ organizationId, event: "roleplay.started", payload: { id: session.id, scenarioId: scenario.id }, idempotencyKey: `roleplay.started:${session.id}` });
  // return with hiddenContext stripped for seller; include messages
  const messages = await prisma.roleplayMessage.findMany({ where: { sessionId: session.id }, orderBy: { timestamp: "asc" } });
  const { hiddenContext: _hc, ...scenarioPublic } = scenario as unknown as { hiddenContext: unknown } & typeof scenario;
  return NextResponse.json({ ...session, scenario: scenarioPublic, messages }, { status: 201 });
}

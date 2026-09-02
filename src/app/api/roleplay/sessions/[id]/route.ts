import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const session = await prisma.roleplaySession.findFirst({
    where: { id, organizationId, userId },
    include: { scenario: true, messages: { orderBy: { timestamp: "asc" } }, evaluation: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  // strip hiddenContext — seller must not see (§50)
  const sc = session.scenario as unknown as Record<string, unknown>;
  const { hiddenContext: _hc, ...scenarioPublic } = sc;
  return NextResponse.json({ ...session, scenario: scenarioPublic });
}

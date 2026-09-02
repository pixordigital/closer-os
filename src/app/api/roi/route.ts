import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";

const schema = z.object({
  dealId: z.string().cuid(),
  inputs: z.object({
    leads: z.number(),
    ticket: z.number(),
    currentRate: z.number(),
    improvedRate: z.number(),
    investment: z.number(),
  }),
  scenarios: z.array(z.object({
    scenario: z.enum(["CONSERVATIVE","BASE","OPTIMISTIC"]),
    monthly: z.number(),
    annual: z.number(),
    roi: z.number(),
    payback: z.number().nullable(),
  })),
});

export async function GET(req: Request) {
  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const dealId = url.searchParams.get("dealId")?.trim() || undefined;
  const items = await prisma.rOIModel.findMany({
    where: { organizationId, ...(dealId ? { dealId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { deal: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { dealId, inputs, scenarios } = parsed.data;
  const deal = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  const created = [];
  for (const s of scenarios) {
    const outputs = { monthlySavings: s.monthly, annualSavings: s.annual, roi: s.roi, paybackPeriod: s.payback };
    const m = await prisma.rOIModel.create({
      data: { organizationId, dealId, scenario: s.scenario as never, inputs, outputs },
    });
    created.push(m);
  }
  return NextResponse.json({ created }, { status: 201 });
}

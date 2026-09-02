import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";
import { extractObjections, extractWithAI } from "@/lib/objections";

const schema = z.object({
  callId: z.string().cuid().optional().nullable(),
  dealId: z.string().cuid().optional().nullable(),
  transcript: z.string().min(10).max(20000).optional(),
});

export async function POST(req: Request) {
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  let text = parsed.data.transcript?.trim() ?? "";
  let callId = parsed.data.callId ?? null;
  let dealId = parsed.data.dealId ?? null;

  if (callId && !text) {
    const call = await prisma.call.findFirst({ where: { id: callId, organizationId }, include: { transcript: true, deal: true } });
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    text = call.transcript?.content ?? "";
    dealId = call.dealId ?? dealId;
    if (!text) return NextResponse.json({ error: "Call sem transcript" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Transcript vazio" }, { status: 400 });

  let extracted = await extractWithAI(text);
  if (!extracted || extracted.length === 0) extracted = extractObjections(text);

  if (extracted.length === 0) return NextResponse.json({ extracted: [], created: [], message: "Nenhuma objeção detectada" });

  const created = [];
  for (const e of extracted) {
    const exists = await prisma.objection.findFirst({ where: { organizationId, callId: callId ?? undefined, content: e.content } });
    if (exists) { created.push(exists); continue; }
    const obj = await prisma.objection.create({ data: { organizationId, dealId, callId, category: e.category as never, content: e.content } });
    created.push(obj);
  }
  return NextResponse.json({ extracted, created });
}

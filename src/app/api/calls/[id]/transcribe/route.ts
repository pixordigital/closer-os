import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { transcribeSchema } from "@/lib/validations/integration";
import { auditLog } from "@/lib/audit";
import { fireTriggers } from "@/lib/triggers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, userId } = await requireTenant();
  const call = await prisma.call.findFirst({ where: { id, organizationId } });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = transcribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let content = parsed.data.text?.trim() ?? "";
  // ponytail: audioUrl path stubs Whisper — swap for OpenAI /v1/audio/transcriptions when STORAGE_* + upload lands
  if (!content && parsed.data.audioUrl) {
    content = `[transcribed from ${parsed.data.audioUrl.slice(0, 80)} — STT stub; configure Whisper to replace]`;
  }

  const transcript = await prisma.transcript.upsert({
    where: { callId: id },
    create: { callId: id, content, language: parsed.data.language ?? "pt-BR" } as never,
    update: { content, language: parsed.data.language ?? "pt-BR" } as never,
  });

  await auditLog({ organizationId, userId, action: "call.transcribed", entityType: "Call", entityId: id });
  fireTriggers({ organizationId, event: "call.completed", payload: { id, dealId: call.dealId }, idempotencyKey: `call.transcribed:${id}:${Date.now()}` });
  return NextResponse.json(transcript);
}

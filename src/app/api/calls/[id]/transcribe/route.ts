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

  const ct = req.headers.get("content-type") ?? "";
  let rawText: string | undefined;
  let rawAudioUrl: string | undefined;
  let rawLanguage: string | undefined;
  let file: File | null = null;
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (fd) {
      file = fd.get("audio") as File | null ?? fd.get("file") as File | null;
      rawText = (fd.get("text") as string | null) ?? undefined;
      rawAudioUrl = (fd.get("audioUrl") as string | null) ?? undefined;
      rawLanguage = (fd.get("language") as string | null) ?? undefined;
    }
  }
  if (file) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "OPENAI_API_KEY não configurada para Whisper" }, { status: 400 });
    const fd = new FormData();
    fd.append("file", file, file.name || "audio.webm");
    fd.append("model", "whisper-1");
    fd.append("language", (rawLanguage ?? "pt").slice(0, 2));
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd as unknown as BodyInit });
    if (!r.ok) return NextResponse.json({ error: `Whisper ${r.status}: ${await r.text()}` }, { status: 502 });
    const j = await r.json() as { text?: string };
    rawText = j.text ?? "";
  }
  if (!file) {
    const body = await req.json().catch(() => null);
    const parsed = transcribeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    rawText = parsed.data.text?.trim() ?? undefined;
    rawAudioUrl = parsed.data.audioUrl ?? undefined;
    rawLanguage = parsed.data.language ?? undefined;
    if (!rawText && rawAudioUrl) {
      rawText = `[transcribed from ${rawAudioUrl.slice(0, 80)} — STT stub; configure Whisper to replace]`;
    }
    if (!rawText) return NextResponse.json({ error: "Informe text ou audio file" }, { status: 400 });
  }
  let content = rawText?.trim() ?? "";

  const transcript = await prisma.transcript.upsert({
    where: { callId: id },
    create: { callId: id, content, language: rawLanguage ?? "pt-BR" } as never,
    update: { content, language: rawLanguage ?? "pt-BR" } as never,
  });
  await prisma.call.update({ where: { id }, data: { analysisStatus: "PENDING" as never } }).catch(() => {});
  try {
    const { enqueueJob } = await import("@/lib/jobs");
    await enqueueJob({ organizationId, type: "analyze_transcript" as never, payload: { callId: id, organizationId } });
  } catch {}

  await auditLog({ organizationId, userId, action: "call.transcribed", entityType: "Call", entityId: id });
  fireTriggers({ organizationId, event: "call.completed", payload: { id, dealId: call.dealId }, idempotencyKey: `call.transcribed:${id}:${Date.now()}` });
  return NextResponse.json(transcript);
}

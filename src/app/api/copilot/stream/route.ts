import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { buildCopilotPrompt } from "@/lib/copilot";
import { getAIProvider } from "@/lib/ai/init";
import { z } from "zod";

const qSchema = z.object({ callId: z.string().cuid().optional(), dealId: z.string().cuid().optional() });

// ponytail: SSE long-poll, not Redis pub/sub. Ceiling ~10 concurrent streams per instance; swap to Redis when measured.
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`copilot:stream:${ip}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const { organizationId } = await requireTenant();
  const url = new URL(req.url);
  const parsed = qSchema.safeParse({ callId: url.searchParams.get("callId") ?? undefined, dealId: url.searchParams.get("dealId") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { callId, dealId } = parsed.data;

  let deal: unknown = null;
  let transcriptSlice: string | undefined;
  if (dealId) {
    const d = await prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!d) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    deal = d;
  }
  if (callId) {
    const c = await prisma.call.findFirst({ where: { id: callId, organizationId }, include: { transcript: true } });
    if (!c) return NextResponse.json({ error: "Call not found" }, { status: 404 });
    if (c.transcript?.content) transcriptSlice = c.transcript.content.slice(0, 6000);
    if (!deal && c.dealId) {
      const d = await prisma.deal.findFirst({ where: { id: c.dealId, organizationId } });
      if (d) deal = d;
    }
  }

  const prompt = buildCopilotPrompt({ deal, transcriptSlice });
  const provider = getAIProvider();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`)); } catch {}
      };
      // initial frame
      send({ type: "hello", ts: new Date().toISOString() });

      const tick = async () => {
        if (closed) return;
        try {
          const text = await provider.generateText({ prompt, system: "Você é um copilot de vendas. Retorne JSON.", temperature: 0.3, maxTokens: 600 });
          // try parse suggestions; fallback to raw text chunk
          let payload: unknown;
          try { payload = JSON.parse(text); } catch { payload = { suggestions: [{ text, evidence: "No Evidence", confidence: 0.4, whyItMatters: "Sugestão gerada" }] }; }
          send({ type: "suggestion", payload, ts: new Date().toISOString() });
        } catch (e) {
          send({ type: "error", error: String(e).slice(0, 500) });
        }
      };

      await tick();
      const interval = setInterval(tick, 8000);
      const timeout = setTimeout(() => { clearInterval(interval); closed = true; try { controller.close(); } catch {} }, 60_000);

      // ponytail: no request signal in Next 16 route handler; close on timeout only
      // client disconnect handled by stream cancel
      (stream as unknown as { cancel?: () => void }).cancel = () => { clearInterval(interval); clearTimeout(timeout); closed = true; };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

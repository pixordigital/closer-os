import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/whatsapp/webhook — Evolution inbound (no auth cookie, apiKey via header/query)
export async function POST(req: Request) {
  const rl = checkRateLimit(`wa:webhook:${getClientIp(req)}`, { windowMs: 60_000, max: 120 });
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retryMs: rl.retryAfterMs }, { status: 429 });

  const raw = await req.text();
  let body: Record<string, unknown>;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Auth: Evolution sends apikey header or query ?apikey=  (ponytail: accept either, skip if EVOLUTION_API_KEY not set)
  const expected = process.env.EVOLUTION_API_KEY ?? "";
  if (expected) {
    const got = req.headers.get("apikey") ?? req.headers.get("x-api-key") ?? new URL(req.url).searchParams.get("apikey") ?? "";
    if (got !== expected) return NextResponse.json({ error: "Invalid apikey" }, { status: 401 });
  }

  // Resolve instance: Evolution payload has { instance, event, data } or { instanceName, ... }
  const instance = String((body.instance ?? body.instanceName ?? (body.data as Record<string,unknown>)?.instance ?? "")).trim();
  const event = String(body.event ?? body.type ?? "").toLowerCase();
  // data can be nested
  const data = (body.data ?? body.payload ?? {}) as Record<string, unknown>;

  // Resolve org via IntegrationConnection (id == instance OR config.instance == instance)
  let organizationId: string | null = null;
  if (instance) {
    const conns = await prisma.integrationConnection.findMany({ where: { kind: "whatsapp" }, select: { organizationId: true, id: true, config: true } });
    const hit = conns.find(c => c.id === instance || String((c.config as Record<string,unknown> | null)?.instance ?? "") === instance || String((c.config as Record<string,unknown> | null)?.instanceName ?? "") === instance);
    if (hit) organizationId = hit.organizationId;
  }
  // fallback: payload carries organizationId (manual tests)
  if (!organizationId) organizationId = String((data as Record<string,unknown>).organizationId ?? body.organizationId ?? "") || null;
  if (!organizationId) {
    // still ack 200 to avoid Evolution retries storm — log and return
    await prisma.auditLog.create({ data: { organizationId: "unknown", action: "whatsapp.webhook.orphan", entityType: "WhatsApp", entityId: instance || "unknown", metadata: { event, instance } as never } as never }).catch(()=>{});
    return NextResponse.json({ ok: true, orphan: true, event, instance });
  }

  // Normalize handlers — Evolution events: messages.upsert | messages.update | connection.update | send.message | presence.update
  try {
    if (event.includes("message") || event.includes("upsert")) {
      // Baileys messages.upsert: data.messages or data.key+message
      const msgs: Array<Record<string, unknown>> = Array.isArray(data.messages) ? data.messages as Record<string,unknown>[]
        : data.key ? [data as Record<string,unknown>]
        : Array.isArray(data) ? data as Record<string,unknown>[]
        : [data];
      for (const m of msgs) {
        const key = (m.key ?? m) as Record<string, unknown>;
        const fromMe = !!(key.fromMe ?? (m as Record<string,unknown>).fromMe);
        if (fromMe) continue; // outbound echoes
        const remoteJid = String(key.remoteJid ?? (m as Record<string,unknown>).remoteJid ?? "");
        const num = remoteJid.replace(/@.*/, "").replace(/\D/g, "");
        // text extraction: message.conversation | extendedTextMessage.text | imageMessage.caption
        const msgObj = (m.message ?? m) as Record<string, unknown>;
        const text = String(
          msgObj.conversation
          ?? (msgObj.extendedTextMessage as Record<string,unknown> | undefined)?.text
          ?? (msgObj.imageMessage as Record<string,unknown> | undefined)?.caption
          ?? (msgObj.videoMessage as Record<string,unknown> | undefined)?.caption
          ?? ""
        ).trim();
        if (!num) continue;

        // opt-out detection
        const lower = text.toLowerCase();
        const isOptOut = /\b(parar|cancelar|sair|remover|descadastrar|stop|unsubscribe|nao.*quero|não.*quero)\b/i.test(lower);
        if (isOptOut) {
          await prisma.auditLog.create({ data: { organizationId, action: "whatsapp.optout", entityType: "WhatsApp", entityId: num, metadata: { text: text.slice(0,500), remoteJid, instance } as never } as never }).catch(()=>{});
        }
        // inbound log + create Task for closer to handle
        await prisma.auditLog.create({ data: { organizationId, action: "whatsapp.inbound", entityType: "WhatsApp", entityId: num, metadata: { text: text.slice(0,1000), remoteJid, instance, event } as never } as never }).catch(()=>{});
        // auto-create Task if not optout and text meaningful (avoid noise: min 2 chars)
        if (!isOptOut && text.length >= 2) {
          // deduplicate: same number + same text within 5min skip
          const recent = await prisma.task.findFirst({ where:{ organizationId, title:{ contains: num } as never, createdAt:{ gte: new Date(Date.now()-300000) } } as never }).catch(()=>null);
          if (!recent) {
            // try link to deal via contact phone
            const contact = await prisma.contact.findFirst({ where:{ organizationId, phone:{ contains: num.slice(-8) } as never }, select:{ id:true, companyId:true } }).catch(()=>null);
            const deal = contact ? await prisma.deal.findFirst({ where:{ organizationId, companyId: contact.companyId, stage:{ notIn:["WON","LOST"] as never } }, select:{ id:true } }).catch(()=>null) : null;
            await prisma.task.create({ data:{
              organizationId,
              title: `WhatsApp inbound ${num}: ${text.slice(0,60)}`,
              description: `De: ${num} (${remoteJid})\nInstância: ${instance}\nMensagem: ${text.slice(0,2000)}\n\nResponder em /deals/${deal?.id ?? ""}`,
              status:"TODO" as never, dueDate: new Date(Date.now()+3600000*4), dealId: deal?.id ?? null,
            } as never }).catch(()=>{});
          }
        }
      }
    } else if (event.includes("connection") || event.includes("state")) {
      const state = String(data.state ?? data.connection ?? (data as Record<string,unknown>).status ?? "").toLowerCase();
      // map evolution states: open -> connected, close/close -> disconnected, connecting -> connecting
      const mapped = state.includes("open") ? "connected" : state.includes("close") || state.includes("logout") ? "disconnected" : state.includes("connecting") ? "connecting" : state || "unknown";
      if (instance) {
        await prisma.integrationConnection.updateMany({ where:{ id: instance }, data:{ status: mapped } }).catch(()=>{});
        // also try config.instance match
        const all = await prisma.integrationConnection.findMany({ where:{ kind:"whatsapp" }, select:{ id:true, config:true } });
        for (const c of all) {
          if (String((c.config as Record<string,unknown> | null)?.instance ?? "") === instance) {
            await prisma.integrationConnection.update({ where:{ id:c.id }, data:{ status: mapped } }).catch(()=>{});
          }
        }
      }
      await prisma.auditLog.create({ data:{ organizationId, action:"whatsapp.connection", entityType:"WhatsApp", entityId: instance, metadata:{ state, mapped, event } as never } as never }).catch(()=>{});
    } else if (event.includes("ack") || event.includes("update")) {
      await prisma.auditLog.create({ data:{ organizationId, action:"whatsapp.ack", entityType:"WhatsApp", entityId: instance, metadata:{ event, data } as never } as never }).catch(()=>{});
    } else {
      // generic log for unknown events (keep observability)
      await prisma.auditLog.create({ data:{ organizationId, action:"whatsapp.webhook", entityType:"WhatsApp", entityId: instance || "unknown", metadata:{ event, data: JSON.stringify(data).slice(0,2000) } as never } as never }).catch(()=>{});
    }
  } catch (e) {
    await prisma.auditLog.create({ data:{ organizationId, action:"whatsapp.webhook.error", entityType:"WhatsApp", entityId: instance || "unknown", metadata:{ error: String(e).slice(0,500), event } as never } as never }).catch(()=>{});
  }

  return NextResponse.json({ ok: true, event, instance });
}

// Evolution does GET to verify webhook — just 200
export async function GET() {
  return NextResponse.json({ ok: true, webhook: "whatsapp" });
}

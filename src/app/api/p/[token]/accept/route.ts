import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { token } as never });
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  const p = proposal as unknown as { id:string; organizationId:string; dealId:string; status:string; expiresAt: string|null };
  if (p.expiresAt && new Date(p.expiresAt) < new Date()) return NextResponse.json({ error: "Proposta expirada" }, { status: 400 });
  if (p.status === "ACCEPTED") return NextResponse.json({ ok:true, already:true });
  const ip = (_req.headers.get("x-forwarded-for") ?? _req.headers.get("x-real-ip") ?? "").split(",")[0].trim() || null;
  await prisma.proposal.update({ where:{ id: p.id }, data:{ status:"ACCEPTED", acceptedAt: new Date(), acceptedIp: ip } as never });
  // advance deal to WON (if not already)
  try {
    const deal = await prisma.deal.findFirst({ where:{ id: p.dealId, organizationId: p.organizationId } });
    if (deal && (deal as {stage:string}).stage !== "WON") {
      await prisma.deal.update({ where:{ id: p.dealId }, data:{ stage:"WON" as never } });
      await prisma.auditLog.create({ data:{ organizationId: p.organizationId, action:"proposal.accepted", entityType:"Proposal", entityId: p.id, metadata:{ dealId: p.dealId, ip } as never } as never }).catch(()=>{});
      const { fireTriggers } = await import("@/lib/triggers");
      fireTriggers({ organizationId: p.organizationId, event:"deal.updated", payload:{ id: p.dealId, stage:"WON", via:"proposal" }, idempotencyKey:`proposal.accepted:${p.id}` });
    }
  } catch {}
  // redirect back to proposal page for browser form POST
  const accept = _req.headers.get("accept") ?? "";
  if (accept.includes("text/html") || _req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL(`/p/${token}`, _req.url), 303);
  }
  return NextResponse.json({ ok:true });
}
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) { return POST(req, ctx); }

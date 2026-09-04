import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await prisma.proposal.findUnique({ where: { token } as never });
  if (!proposal) return NextResponse.json({ error:"Proposal not found" }, { status:404 });
  const p = proposal as unknown as { id:string; organizationId:string; status:string };
  if (p.status==="REJECTED") return NextResponse.json({ ok:true, already:true });
  await prisma.proposal.update({ where:{ id: p.id }, data:{ status:"REJECTED", rejectedAt: new Date() } as never });
  await prisma.auditLog.create({ data:{ organizationId: p.organizationId, action:"proposal.rejected", entityType:"Proposal", entityId: p.id } as never }).catch(()=>{});
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html") || req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    return NextResponse.redirect(new URL(`/p/${token}`, req.url), 303);
  }
  return NextResponse.json({ ok:true });
}
export async function GET(req: Request, ctx:{ params: Promise<{token:string}>}){ return POST(req, ctx); }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dealId = url.searchParams.get("d");
  const dest = url.searchParams.get("url") ?? url.searchParams.get("u");
  const step = url.searchParams.get("s");
  if (dealId) {
    try {
      const fu = await prisma.followUp.findFirst({ where: { dealId, content: { contains: `[tracking:${dealId}` } }, orderBy: { createdAt: "desc" } });
      if (fu) {
        await prisma.auditLog.create({ data: { organizationId: fu.organizationId, action: "followup.clicked", entityType: "FollowUp", entityId: fu.id, metadata: { dealId, step, dest, ip: req.headers.get("x-forwarded-for") } as never } as never }).catch(()=>{});
      }
    } catch {}
  }
  console.log(`[track] click deal=${dealId} step=${step} dest=${dest} ip=${req.headers.get("x-forwarded-for")}`);
  if (dest) {
    try {
      const u = new URL(dest);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error("bad proto");
      return NextResponse.redirect(u.toString(), 302);
    } catch {
      return NextResponse.json({ error: "url inválida" }, { status: 400 });
    }
  }
  // sem destino: 1x1 gif pra compat com pixel clients
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  return new NextResponse(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}

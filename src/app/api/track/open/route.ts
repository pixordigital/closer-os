import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req:Request){
  const url=new URL(req.url);
  const dealId=url.searchParams.get("d");
  const step=url.searchParams.get("s");
  // marca follow-up como aberto quando existir (best-effort)
  if(dealId){
    try{
      const fu = await prisma.followUp.findFirst({ where:{ dealId, content:{ contains:`[tracking:${dealId}` } }, orderBy:{ createdAt:"desc" } });
      if(fu){
        // ponytail: sem coluna aberta, usa content marker + audit; upgrade quando FollowUp ganhar openedAt
        await prisma.auditLog.create({ data:{ organizationId: fu.organizationId, action:"followup.opened", entityType:"FollowUp", entityId:fu.id, metadata:{ dealId, step, ip: req.headers.get("x-forwarded-for") } as never } as never }).catch(()=>{});
      }
    }catch{}
  }
  console.log(`[track] open deal=${dealId} step=${step} ip=${req.headers.get("x-forwarded-for")}`);
  const gif=Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7","base64");
  return new NextResponse(gif, { headers:{ "Content-Type":"image/gif", "Cache-Control":"no-store" } });
}

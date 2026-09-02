import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { z } from "zod";

const schema = z.object({ userName: z.string().min(2).max(80).optional(), orgName: z.string().min(2).max(80).optional(), locale: z.enum(["pt-BR","en"]).optional() });

export async function GET(){
  const { organizationId, userId } = await requireTenant();
  const [user, org, membership] = await Promise.all([
    prisma.user.findUnique({ where:{ id:userId }, select:{ id:true, name:true, email:true, locale:true } }),
    prisma.organization.findUnique({ where:{ id:organizationId }, select:{ id:true, name:true, slug:true } }),
    prisma.membership.findFirst({ where:{ userId, organizationId }, select:{ role:true } }),
  ]);
  return NextResponse.json({ user, org, membership });
}

export async function PATCH(req:Request){
  const { organizationId, userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const { userName, orgName, locale } = parsed.data;
  if(userName){
    await prisma.user.update({ where:{ id:userId }, data:{ name: userName } });
  }
  if(orgName){
    await prisma.organization.update({ where:{ id:organizationId }, data:{ name: orgName } });
  }
  if(locale){
    await prisma.user.update({ where:{ id:userId }, data:{ locale } });
    const res = NextResponse.json({ ok:true });
    res.cookies.set("locale", locale, { path:"/", maxAge: 60*60*24*365, sameSite:"lax" });
    return res;
  }
  return NextResponse.json({ ok:true });
}

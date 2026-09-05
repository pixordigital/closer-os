import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  content: z.string().min(1).max(4000).optional(),
  category: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req:Request, { params }: { params: Promise<{id:string}> }){
  const { organizationId } = await requireTenant();
  const { id } = await params;
  const body=await req.json().catch(()=>null);
  const parsed=patchSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const cur=await prisma.whatsappTemplate.findFirst({ where:{ id, organizationId } });
  if(!cur) return NextResponse.json({ error:"Not found" }, { status:404 });
  if(parsed.data.name && parsed.data.name !== cur.name){
    const dup=await prisma.whatsappTemplate.findFirst({ where:{ organizationId, name: parsed.data.name } }).catch(()=>null);
    if(dup) return NextResponse.json({ error:"Nome já existe" }, { status:409 });
  }
  const row=await prisma.whatsappTemplate.update({ where:{ id }, data: parsed.data as never });
  return NextResponse.json(row);
}

export async function DELETE(_req:Request, { params }: { params: Promise<{id:string}> }){
  const { organizationId } = await requireTenant();
  const { id } = await params;
  const cur=await prisma.whatsappTemplate.findFirst({ where:{ id, organizationId } });
  if(!cur) return NextResponse.json({ error:"Not found" }, { status:404 });
  await prisma.whatsappTemplate.delete({ where:{ id } });
  return NextResponse.json({ ok:true, deleted:id });
}

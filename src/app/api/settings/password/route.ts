import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(128) });

export async function POST(req:Request){
  const { userId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = schema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where:{ id:userId } });
  if(!user) return NextResponse.json({ error:"User not found" }, { status:404 });
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if(!ok) return NextResponse.json({ error:"Senha atual incorreta" }, { status:401 });
  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where:{ id:userId }, data:{ passwordHash: hash } });
  return NextResponse.json({ ok:true });
}

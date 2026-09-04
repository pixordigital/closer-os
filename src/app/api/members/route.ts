import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function GET(){
  const { organizationId } = await requireTenant();
  const members = await prisma.membership.findMany({
    where:{ organizationId },
    include:{ user:{ select:{ id:true, name:true, email:true } } },
    orderBy:{ createdAt:"asc" },
  });
  return NextResponse.json({ items: members.map(m=>({ id:m.user.id, name:m.user.name, email:m.user.email, role:m.role, membershipId:m.id })) });
}

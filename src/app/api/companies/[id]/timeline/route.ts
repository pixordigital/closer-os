import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireTenant();
  const company = await prisma.company.findFirst({ where: { id, organizationId }, select: { id:true } });
  if (!company) return NextResponse.json({ error:"Not found" }, { status:404 });

  const deals = await prisma.deal.findMany({ where:{ companyId:id, organizationId }, select:{ id:true } });
  const dealIds = deals.map(d=>d.id);

  const [dealsFull, calls, tasks, followUps, contacts] = await Promise.all([
    prisma.deal.findMany({ where:{ companyId:id, organizationId }, orderBy:{ createdAt:"desc" }, take:50, select:{ id:true, name:true, stage:true, value:true, currency:true, createdAt:true, updatedAt:true } }),
    dealIds.length ? prisma.call.findMany({ where:{ dealId:{ in: dealIds } }, orderBy:{ createdAt:"desc" }, take:50, select:{ id:true, title:true, status:true, dealId:true, createdAt:true } }) : [],
    dealIds.length ? prisma.task.findMany({ where:{ dealId:{ in: dealIds } }, orderBy:{ createdAt:"desc" }, take:50, select:{ id:true, title:true, status:true, dealId:true, createdAt:true, dueDate:true } }) : [],
    dealIds.length ? prisma.followUp.findMany({ where:{ dealId:{ in: dealIds } }, orderBy:{ createdAt:"desc" }, take:50, select:{ id:true, subject:true, type:true, status:true, dealId:true, createdAt:true } }) : [],
    prisma.contact.findMany({ where:{ companyId:id, organizationId }, orderBy:{ createdAt:"desc" }, take:20, select:{ id:true, name:true, createdAt:true } }),
  ]);

  type Item = { type:string; date:string; title:string; href:string; meta?:string };
  const items: Item[] = [];
  for (const d of dealsFull) items.push({ type:"deal", date: d.updatedAt.toISOString(), title:`Deal: ${d.name}`, href:`/deals/${d.id}`, meta:`${d.stage}${d.value?` · ${new Intl.NumberFormat("pt-BR",{style:"currency",currency:d.currency}).format(Number(d.value))}`:""}` });
  for (const c of calls) items.push({ type:"call", date: c.createdAt.toISOString(), title:`Call: ${c.title}`, href:`/calls/${c.id}`, meta: c.status });
  for (const t of tasks) items.push({ type:"task", date: (t.createdAt).toISOString(), title:`Task: ${t.title}`, href:`/tasks/${t.dealId}/edit`, meta: `${t.status}${t.dueDate?` · vence ${new Date(t.dueDate).toLocaleDateString("pt-BR")}`:""}` });
  for (const f of followUps) items.push({ type:"follow_up", date: f.createdAt.toISOString(), title:`Follow-up: ${f.subject ?? f.type}`, href:`/follow-ups?dealId=${f.dealId}`, meta: f.status });
  for (const ct of contacts) items.push({ type:"contact", date: ct.createdAt.toISOString(), title:`Contato: ${ct.name}`, href:`/contacts/${ct.id}` });

  items.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json({ items: items.slice(0,80), counts:{ deals: dealsFull.length, calls: calls.length, tasks: tasks.length, followUps: followUps.length } });
}

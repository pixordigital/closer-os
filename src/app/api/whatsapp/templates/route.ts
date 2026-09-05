import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  content: z.string().min(1).max(4000),
  category: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

const DEFAULTS = [
  { name:"Follow-up D+1", content:"Oi {{nome}}, obrigado pelo papo hoje! Como combinado, segue próximo passo: {{nextStep}}. Quando falamos de novo?", category:"followup" },
  { name:"Lembrete call", content:"Oi {{nome}}, lembrando nossa call {{data}} às {{hora}}. Confirma? Qualquer coisa me chama aqui.", category:"reminder" },
  { name:"Proposta", content:"Oi {{nome}}, enviei a proposta de {{valor}}. Dá uma olhada e me diz o que achou — tiro qualquer dúvida por aqui.", category:"proposal" },
  { name:"Check-in parado", content:"Oi {{nome}}, vi que o projeto ficou parado. Voltou a ser prioridade? Posso ajudar a destravar.", category:"nurture" },
  { name:"Áudio — resumo", content:"Oi {{nome}}, gravei um áudio resumindo o que conversamos + próximo passo. Me diz se faz sentido?", category:"followup" },
];

export async function GET(){
  const { organizationId } = await requireTenant();
  let items = await prisma.whatsappTemplate.findMany({ where:{ organizationId }, orderBy:{ createdAt:"asc" } }).catch(()=>[]) as unknown as Array<Record<string,unknown>>;
  if(items.length===0){
    // auto-seed defaults (ponytail: lazy seed on first GET, no migration seed)
    for(const d of DEFAULTS){
      await prisma.whatsappTemplate.create({ data:{ organizationId, name:d.name, content:d.content, category:d.category } as never }).catch(()=>{});
    }
    items = await prisma.whatsappTemplate.findMany({ where:{ organizationId }, orderBy:{ createdAt:"asc" } }).catch(()=>[]) as unknown as Array<Record<string,unknown>>;
  }
  return NextResponse.json({ templates: items });
}

export async function POST(req:Request){
  const { organizationId } = await requireTenant();
  const body = await req.json().catch(()=>null);
  const parsed = createSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status:400 });
  const exists = await prisma.whatsappTemplate.findFirst({ where:{ organizationId, name: parsed.data.name } }).catch(()=>null);
  if(exists) return NextResponse.json({ error:"Template com esse nome já existe" }, { status:409 });
  const row = await prisma.whatsappTemplate.create({ data:{ organizationId, ...parsed.data } as never });
  return NextResponse.json(row, { status:201 });
}

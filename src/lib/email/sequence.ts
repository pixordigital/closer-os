import { prisma } from "@/lib/db";

export const SEQUENCE_TEMPLATES = [
  { day: 1, subject: "Sobre nossa conversa — próximo passo", content: "Oi {{nome}}, obrigado pelo papo. Como combinado, segue resumo + próximo passo. Quando falamos de novo? {abraço|abs|até breve}" },
  { day: 3, subject: "Conseguiu ver?", content: "Oi {{nome}}, só passando pra ver se conseguiu validar internamente. Se precisar, mando case similar. {topa 15min amanhã?|conseguimos 20min quinta?}" },
  { day: 7, subject: "Último toque — deixo aberto", content: "Oi {{nome}}, entendo prioridade. Deixo meu contato e um material. Se fizer sentido no próximo tri, me avisa. {sucesso nos projetos|conte comigo}" },
];

export async function createSequence(organizationId:string, dealId:string, contactEmail?:string){
  const deal = await prisma.deal.findFirst({ where:{ id: dealId, organizationId } });
  if(!deal) throw new Error("Deal not found");
  const created=[];
  for(const t of SEQUENCE_TEMPLATES){
    const due=new Date(); due.setDate(due.getDate()+t.day);
    const f=await prisma.followUp.create({ data:{
      organizationId, dealId,
      type:"EMAIL" as never,
      subject: t.subject, content: t.content + `\n\n[tracking:${dealId}:${t.day}]`,
      status:"DRAFT" as never,
    } as never });
    // also create task for closer to review
    await prisma.task.create({ data:{ organizationId, dealId, title:`Enviar follow-up D+${t.day}`, description:`Revisar e aprovar: ${t.subject}`, dueDate: due, status:"TODO" as never } as never });
    created.push(f);
  }
  return created;
}

export function trackingPixel(dealId:string, step:number){
  const base=process.env.APP_URL ?? "";
  return `${base}/api/track/open?d=${dealId}&s=${step}`;
}

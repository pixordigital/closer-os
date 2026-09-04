import { prisma } from "./db";

// ponytail: pure helper, no new dep — reuses today queries, returns html
export async function buildDigest(organizationId:string){
  const start=new Date(); start.setHours(0,0,0,0);
  const end=new Date(); end.setHours(23,59,59,999);
  const staleCut=new Date(Date.now()-7*864e5);
  const [overdue,dueToday,noNextStep,stale,callsToday]=await Promise.all([
    prisma.task.findMany({ where:{ organizationId, status:{in:["TODO","IN_PROGRESS"] as never}, dueDate:{lt:start}}, take:10, select:{title:true, dueDate:true, deal:{select:{name:true}}}}),
    prisma.task.findMany({ where:{ organizationId, status:{in:["TODO","IN_PROGRESS"] as never}, dueDate:{gte:start,lte:end}}, take:10, select:{title:true, deal:{select:{name:true}}}}),
    prisma.deal.findMany({ where:{ organizationId, stage:{notIn:["WON","LOST"] as never}, OR:[{nextStep:null},{nextStep:""}]}, take:10, select:{name:true, stage:true, value:true}}),
    prisma.deal.findMany({ where:{ organizationId, stage:{notIn:["WON","LOST"] as never}, updatedAt:{lt:staleCut}}, take:10, select:{name:true, stage:true, updatedAt:true, value:true}}),
    prisma.call.findMany({ where:{ organizationId, scheduledAt:{gte:start,lte:end}}, take:10, select:{title:true, scheduledAt:true}}),
  ]);
  const lines:string[]=[];
  lines.push(`# Digest ${new Date().toLocaleDateString("pt-BR")} — Closer OS`);
  lines.push(`Atrasadas: ${overdue.length} | Hoje: ${dueToday.length} | Sem next step: ${noNextStep.length} | Paradas 7d: ${stale.length} | Calls hoje: ${callsToday.length}`);
  if(overdue.length) lines.push("\nAtrasadas:\n"+overdue.map(t=>`- ${t.title}${t.deal?` (${t.deal.name})`:""} — vence ${t.dueDate?new Date(t.dueDate).toLocaleDateString("pt-BR"):"—"}`).join("\n"));
  if(dueToday.length) lines.push("\nHoje:\n"+dueToday.map(t=>`- ${t.title}${t.deal?` (${t.deal.name})`:""}`).join("\n"));
  if(noNextStep.length) lines.push("\nSem next step:\n"+noNextStep.map(d=>`- ${d.name} [${d.stage}]`).join("\n"));
  if(stale.length) lines.push("\nParadas 7d:\n"+stale.map(d=>`- ${d.name} [${d.stage}]`).join("\n"));
  if(callsToday.length) lines.push("\nCalls hoje:\n"+callsToday.map(c=>`- ${c.title} ${c.scheduledAt?new Date(c.scheduledAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):""}`).join("\n"));
  const text=lines.join("\n");
  const html=`<div style="font-family:sans-serif;max-width:640px"><h2>Closer OS — Digest ${new Date().toLocaleDateString("pt-BR")}</h2><p>Atrasadas ${overdue.length} · Hoje ${dueToday.length} · Sem next step ${noNextStep.length} · Paradas ${stale.length} · Calls hoje ${callsToday.length}</p><pre style="white-space:pre-wrap;background:#111;color:#eee;padding:12px;border-radius:8px">${text}</pre><p><a href="${process.env.APP_URL ?? ""}/today">Abrir Hoje →</a></p></div>`;
  return { text, html, counts:{ overdue:overdue.length, dueToday:dueToday.length, noNextStep:noNextStep.length, stale:stale.length, callsToday:callsToday.length } };
}

export function next08h():Date{
  const d=new Date(); d.setSeconds(0,0);
  if(d.getHours()>=8){ d.setDate(d.getDate()+1); }
  d.setHours(8,0,0,0);
  return d;
}

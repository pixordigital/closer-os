import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { PLAYBOOK } from "@/lib/live-coach";
import { Transcriber } from "@/components/objections/transcriber";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ObjectionsPage(){
  const { organizationId } = await requireTenant();
  const [objs, calls, deals] = await Promise.all([
    prisma.objection.findMany({ where:{ organizationId }, orderBy:{ createdAt:"desc" }, take:100, include:{ call:{ select:{ id:true,title:true } }, deal:{ select:{ id:true,name:true } } } }),
    prisma.call.findMany({ where:{ organizationId }, select:{ id:true,title:true }, orderBy:{ createdAt:"desc" }, take:50 }),
    prisma.deal.findMany({ where:{ organizationId }, select:{ id:true,name:true }, orderBy:{ createdAt:"desc" }, take:50 }),
  ]);
  const byCat = Object.entries(
    objs.reduce((a,o)=>{ a[o.category]=(a[o.category]??0)+1; return a; }, {} as Record<string,number>)
  ).sort((a,b)=>b[1]-a[1]);
  const max = Math.max(1, ...byCat.map(([,n])=>n));
  const dict = Object.entries(PLAYBOOK).map(([cat, play])=>{
    const count = objs.filter(o=>o.category===cat).length;
    const examples = objs.filter(o=>o.category===cat).slice(0,3);
    return { cat, play, count, examples };
  }).sort((a,b)=>b.count-a.count);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-semibold tracking-tight">Objeções — Dashboard & Dicionário</h1><p className="text-sm text-zinc-400">Transcreva calls → mapeia automático → alimenta dashboard e Live Coach</p></div>
        <Link href="/live"><Button size="sm">→ Live Coach</Button></Link>
      </div>

      <Transcriber calls={calls} deals={deals} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Mais comuns ({objs.length} total)</h2>
        <div className="mt-4 space-y-2">
          {byCat.length===0 && <p className="text-sm text-zinc-500">Nenhuma objeção mapeada ainda. Transcreva acima.</p>}
          {byCat.map(([cat,n])=>(
            <div key={cat} className="flex items-center gap-3">
              <span className="w-36 text-xs font-medium text-zinc-300">{PLAYBOOK[cat as keyof typeof PLAYBOOK]?.label ?? cat}</span>
              <div className="flex-1 h-2 overflow-hidden rounded bg-zinc-800"><div className="h-full bg-amber-600" style={{ width:`${Math.round(n/max*100)}%` }} /></div>
              <span className="w-16 text-right text-xs text-zinc-400">{n} ({Math.round(n/objs.length*100)}%)</span>
              <Badge>{cat}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Dicionário de objeções — para treinamento e Live Coach</h2>
        <p className="mt-1 text-xs text-zinc-500">Cada categoria vira playbook no Live Coach. Exemplos vêm das calls reais.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {dict.map(d=>(
            <div key={d.cat} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-100">{d.play.label}</span><Badge className={d.count?"bg-amber-600":""}>{d.count} casos</Badge></div>
              <div className="mt-1 text-xs text-zinc-500">{d.cat}</div>
              <div className="mt-2 text-xs leading-relaxed text-zinc-300"><b className="text-amber-400">Contorno:</b> {d.play.suggestion}</div>
              <div className="mt-1 text-xs text-sky-300">Pergunta: {d.play.question}</div>
              {d.examples.length>0 && <div className="mt-2 space-y-1">{d.examples.map(e=><div key={e.id} className="rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-400">“{e.content.slice(0,120)}” — {e.call?.title ?? e.deal?.name ?? "sem vínculo"}</div>)}</div>}
              {d.count>2 && <div className="mt-2"><Link href={`/objections?cat=${d.cat}`} className="text-xs text-sky-400 hover:underline">Ver todos →</Link></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Últimas objeções mapeadas</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-zinc-500"><tr><th className="px-3 py-2 text-left">Objeção</th><th className="px-3 py-2 text-left">Categoria</th><th className="px-3 py-2 text-left">Call/Deal</th><th className="px-3 py-2 text-left">Data</th></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {objs.length===0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-500">Nenhuma ainda</td></tr>}
              {objs.slice(0,30).map(o=>(
                <tr key={o.id} className="hover:bg-zinc-800/40">
                  <td className="px-3 py-2 text-zinc-200">{o.content.slice(0,120)}</td>
                  <td className="px-3 py-2"><Badge>{o.category}</Badge></td>
                  <td className="px-3 py-2 text-xs text-zinc-400">{o.call ? <Link href={`/calls/${o.call.id}`} className="hover:underline">{o.call.title}</Link> : o.deal ? <Link href={`/deals/${o.deal.id}`} className="hover:underline">{o.deal.name}</Link> : "—"}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireTenant, parsePagination } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { taskStatusEnum } from "@/lib/validations/crm";
import type { Prisma } from "@prisma/client";
import { SnoozeButton } from "@/components/tasks/snooze-button";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { organizationId } = await requireTenant();
  const sp = await searchParams;
  const parsedStatus = taskStatusEnum.safeParse((sp.status ?? "").trim().toUpperCase());
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const q = (sp.q ?? "").trim();
  const dealId = (sp.dealId ?? "").trim() || undefined;
  const url = new URL("http://x/?" + new URLSearchParams(sp as Record<string, string>).toString());
  const { page, limit, skip } = parsePagination(url, { page: 1, limit: 20 });

  const where: Prisma.TaskWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(dealId ? { dealId } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [items, total, members] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { deal: { select: { id: true, name: true } } },
    }),
    prisma.task.count({ where }),
    prisma.membership.findMany({ where:{ organizationId }, include:{ user:{ select:{ id:true, name:true } } } }),
  ]);
  const memberMap = new Map(members.map(m=>[m.user.id, m.user.name]));

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <Link href="/tasks/new"><Button size="sm">+ Nova task</Button></Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar task..." className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-500" />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-300">
          <option value="">Todos status</option>
          {["TODO","IN_PROGRESS","DONE","CANCELLED"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <Button type="submit" variant="outline" size="sm">Filtrar</Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr><th className="px-4 py-2 text-left">Task</th><th className="px-4 py-2 text-left">Deal</th><th className="px-4 py-2 text-left">Responsável</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-left">Vencimento</th><th className="px-4 py-2 text-left">Ação</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {items.length===0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-500">Nenhuma task.</td></tr>}
            {items.map(t=>(
              <tr key={t.id} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 font-medium text-zinc-100"><Link href={`/tasks/${t.id}/edit`} className="hover:underline">{t.title}</Link></td>
                <td className="px-4 py-3 text-zinc-400">{t.deal ? <Link href={`/deals/${t.deal.id}`} className="hover:underline">{t.deal.name}</Link> : "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{t.assigneeId ? (memberMap.get(t.assigneeId) ?? t.assigneeId.slice(0,8)) : "—"}</td>
                <td className="px-4 py-3"><Badge>{t.status}</Badge></td>
                <td className="px-4 py-3 text-zinc-400">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <SnoozeButton id={t.id} hours={24} label="+1d" />
                    <SnoozeButton id={t.id} hours={72} label="+3d" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-zinc-500">{total} total · página {page}</div>
    </div>
  );
}

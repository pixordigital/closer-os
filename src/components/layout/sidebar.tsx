"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Kanban, Building2, Users, Phone, Theater, Compass, GraduationCap, Calculator, CheckSquare, Bot, Settings, LogOut, Webhook, Workflow, ListTree, Plug,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/roleplay", label: "Roleplay", icon: Theater },
  { href: "/discovery", label: "Discovery", icon: Compass },
  { href: "/coaching", label: "Coaching", icon: GraduationCap },
  { href: "/roi", label: "ROI", icon: Calculator },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/command", label: "Command", icon: Bot },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/jobs", label: "Jobs", icon: ListTree },
  { href: "/integrations", label: "Integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <span className="text-sm font-bold tracking-tight">CLOSER OS</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">v0.1</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />{label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-2">
        <Link href="/settings" className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
          <Settings className="h-4 w-4" />Settings
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
            <LogOut className="h-4 w-4" />Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

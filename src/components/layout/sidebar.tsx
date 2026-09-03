"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";
import {
  LayoutDashboard, Kanban, Building2, Users, Phone, Theater, Compass, GraduationCap, Calculator, CheckSquare, Bot, Settings, LogOut, Webhook, Workflow, ListTree, Plug, Radio, ShieldAlert,
} from "lucide-react";

const NAV_KEYS = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/pipeline", key: "nav.pipeline", icon: Kanban },
  { href: "/companies", key: "nav.companies", icon: Building2 },
  { href: "/contacts", key: "nav.contacts", icon: Users },
  { href: "/calls", key: "nav.calls", icon: Phone },
  { href: "/live", key: "nav.live", icon: Radio },
  { href: "/objections", key: "nav.objections", icon: ShieldAlert },
  { href: "/roleplay", key: "nav.roleplay", icon: Theater },
  { href: "/discovery", key: "nav.discovery", icon: Compass },
  { href: "/coaching", key: "nav.coaching", icon: GraduationCap },
  { href: "/roi", key: "nav.roi", icon: Calculator },
  { href: "/tasks", key: "nav.tasks", icon: CheckSquare },
  { href: "/command", key: "nav.command", icon: Bot },
  { href: "/webhooks", key: "nav.webhooks", icon: Webhook },
  { href: "/automations", key: "nav.automations", icon: Workflow },
  { href: "/jobs", key: "nav.jobs", icon: ListTree },
  { href: "/integrations", key: "nav.integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <span className="text-sm font-bold tracking-tight">CLOSER OS</span>
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">v0.1</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {NAV_KEYS.map(({ href, key, icon: Icon }) => {
          const label = t(key);
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
          <Settings className="h-4 w-4" />{t("nav.settings")}
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
            <LogOut className="h-4 w-4" />{t("nav.logout")}
          </button>
        </form>
      </div>
    </aside>
  );
}

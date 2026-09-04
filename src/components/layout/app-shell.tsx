"use client";
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/components/i18n/provider";

export function AppShell({ children }:{ children:React.ReactNode }){
  const [open,setOpen]=useState(false);
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex"><Sidebar /></div>
      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex w-64 flex-col bg-zinc-950 border-r border-zinc-800">
            <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800">
              <span className="text-sm font-bold">CLOSER OS</span>
              <button onClick={()=>setOpen(false)} className="p-2 text-zinc-400"><X className="h-5 w-5"/></button>
            </div>
            <div className="flex-1 overflow-auto"><Sidebar /></div>
          </div>
          <div className="flex-1 bg-black/50" onClick={()=>setOpen(false)} />
        </div>
      )}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="flex md:hidden h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 sticky top-0 z-30">
          <div className="flex items-center gap-2"><span className="text-sm font-bold">CLOSER OS</span><span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">v0.1</span></div>
          <button onClick={()=>setOpen(true)} className="p-2 text-zinc-300" aria-label="Menu"><Menu className="h-5 w-5"/></button>
        </header>
        <main className="flex-1 overflow-auto bg-zinc-950 pb-16 md:pb-0">{children}</main>
        {/* Mobile bottom nav — Hoje first, matches native bottomItems */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden border-t border-zinc-800 bg-zinc-950">
          <a href="/today" className="flex flex-1 flex-col items-center py-2 text-[11px] text-zinc-400"><span className="text-sm">☀️</span>{t("nav.today")}</a>
          <a href="/pipeline" className="flex flex-1 flex-col items-center py-2 text-[11px] text-zinc-400"><span className="text-sm">📊</span>Pipe</a>
          <a href="/calls" className="flex flex-1 flex-col items-center py-2 text-[11px] text-zinc-400"><span className="text-sm">📞</span>Calls</a>
          <a href="/tasks" className="flex flex-1 flex-col items-center py-2 text-[11px] text-zinc-400"><span className="text-sm">✅</span>Tasks</a>
          <a href="/settings" className="flex flex-1 flex-col items-center py-2 text-[11px] text-zinc-400"><span className="text-sm">⚙️</span>{t("nav.settings")}</a>
        </nav>
      </div>
    </div>
  );
}

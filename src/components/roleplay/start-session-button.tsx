"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartSessionButton({ scenarioId }: { scenarioId: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  async function start() {
    setLoading(true); setErr(null);
    const res = await fetch("/api/roleplay/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenarioId }) });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.push(`/roleplay/sessions/${j.id}`);
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" disabled={loading} onClick={start}>{loading ? "Iniciando..." : "Start session"}</Button>
      {err && <span className="max-w-xs text-xs text-red-400">{err}</span>}
    </div>
  );
}

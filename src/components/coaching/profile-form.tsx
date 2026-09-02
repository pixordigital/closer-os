"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Profile = {
  sellingStyle?: string | null; targetMarket?: string | null; targetTicket?: string | null;
  preferredMethod?: string | null; strengths?: string[] | null; weaknesses?: string[] | null;
  personalRisks?: string[] | null; coachingPriorities?: string[] | null;
};

function arrToStr(v?: string[] | null) { return (v ?? []).join(", "); }
function strToArr(s: string) { return s.split(",").map(x=>x.trim()).filter(Boolean); }

export function ProfileForm({ initial }: { initial: Profile | null }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      sellingStyle: (fd.get("sellingStyle") as string)?.trim() || null,
      targetMarket: (fd.get("targetMarket") as string)?.trim() || null,
      targetTicket: (fd.get("targetTicket") as string)?.trim() || null,
      preferredMethod: (fd.get("preferredMethod") as string)?.trim() || null,
      strengths: strToArr(fd.get("strengths") as string || ""),
      weaknesses: strToArr(fd.get("weaknesses") as string || ""),
      personalRisks: strToArr(fd.get("personalRisks") as string || ""),
      coachingPriorities: strToArr(fd.get("coachingPriorities") as string || ""),
    };
    const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(()=>({}));
    setLoading(false);
    if (!res.ok) { setErr(JSON.stringify(j.error ?? j, null, 2)); return; }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Personal Sales Profile (§43)</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Selling Style</Label><Input name="sellingStyle" defaultValue={initial?.sellingStyle ?? ""} placeholder="Consultative" /></div>
            <div className="space-y-1.5"><Label>Preferred Method</Label><Input name="preferredMethod" defaultValue={initial?.preferredMethod ?? ""} placeholder="SPIN / Challenger" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Target Market</Label><Input name="targetMarket" defaultValue={initial?.targetMarket ?? ""} placeholder="B2B SaaS / Mid-market" /></div>
            <div className="space-y-1.5"><Label>Target Ticket</Label><Input name="targetTicket" defaultValue={initial?.targetTicket ?? ""} placeholder="R$ 20k–80k" /></div>
          </div>
          <div className="space-y-1.5"><Label>Strengths (vírgula)</Label><Input name="strengths" defaultValue={arrToStr(initial?.strengths)} placeholder="Technical authority, Listening" /></div>
          <div className="space-y-1.5"><Label>Weaknesses (vírgula)</Label><Input name="weaknesses" defaultValue={arrToStr(initial?.weaknesses)} placeholder="Premature pitch, Weak urgency" /></div>
          <div className="space-y-1.5"><Label>Personal Risks (vírgula)</Label><Input name="personalRisks" defaultValue={arrToStr(initial?.personalRisks)} placeholder="Over-explaining, Skips decision process" /></div>
          <div className="space-y-1.5"><Label>Coaching Priorities (vírgula, max 5)</Label><Input name="coachingPriorities" defaultValue={arrToStr(initial?.coachingPriorities)} placeholder="Business Impact, Decision Process" /></div>
          {err && <pre className="whitespace-pre-wrap rounded bg-red-950/50 p-3 text-xs text-red-300">{err}</pre>}
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Salvando..." : "Salvar profile"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

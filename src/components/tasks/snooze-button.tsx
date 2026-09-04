"use client";
export function SnoozeButton({ id, hours, label }:{ id:string; hours:number; label:string }){
  async function snooze(){
    const r=await fetch(`/api/tasks/${id}/snooze`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ hours }) });
    if(r.ok) location.reload(); else alert(await r.text());
  }
  return <button onClick={snooze} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">{label}</button>;
}

"use client";
export function PrintButton({ label="Imprimir / Salvar PDF" }: { label?: string }) {
  return <button onClick={() => window.print()} className="inline-flex h-9 items-center rounded-md bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-100">{label}</button>;
}

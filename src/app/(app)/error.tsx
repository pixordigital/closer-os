"use client";
import { useEffect } from "react";
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "app error", err: String(error.message), digest: error.digest })); }, [error]);
  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-zinc-100">Algo deu errado</h1>
      <p className="mt-1 text-sm text-zinc-400">{error.message || "Erro inesperado."}</p>
      <button onClick={reset} className="mt-4 h-9 rounded-md bg-zinc-800 px-4 text-sm text-zinc-100">Tentar novamente</button>
    </div>
  );
}

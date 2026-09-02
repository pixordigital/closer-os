"use client";
import { useEffect } from "react";
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg: "root error", err: String(error.message), digest: error.digest })); }, [error]);
  return (
    <html lang="pt-BR"><body className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-zinc-400">{error.message || "Erro inesperado."}</p>
        <button onClick={reset} className="mt-4 h-9 rounded-md bg-zinc-800 px-4 text-sm text-zinc-100">Tentar novamente</button>
      </div>
    </body></html>
  );
}

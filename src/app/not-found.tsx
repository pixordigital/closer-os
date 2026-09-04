import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">404 — Não encontrado</h1>
        <p className="mt-2 text-sm text-zinc-400">A página que você procura não existe.</p>
        <Link href="/today" className="mt-4 inline-flex h-9 items-center rounded-md bg-zinc-800 px-4 text-sm text-zinc-100">Voltar ao início</Link>
      </div>
    </div>
  );
}

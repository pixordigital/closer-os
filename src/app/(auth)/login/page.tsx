"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = { email: fd.get("email"), password: fd.get("password"), remember: fd.get("remember")==="on" };
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(json.error ?? "Login failed"); return; }
    router.push(sp.get("next") ?? "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <div className="flex items-center gap-2">
        <input id="remember" name="remember" type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-700 bg-zinc-900" />
        <Label htmlFor="remember" className="text-sm font-normal text-zinc-400">Lembrar de mim — manter logado no app</Label>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      <p className="text-center text-sm text-zinc-400">
        Não tem conta? <Link href="/register" className="underline text-zinc-100">Criar conta</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Closer OS</CardTitle>
        <CardDescription>Entre na sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-zinc-400">Carregando...</p>}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

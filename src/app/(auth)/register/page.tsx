"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"), email: fd.get("email"),
      password: fd.get("password"), orgName: fd.get("orgName"),
    };
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setErr(json.error ?? json.message ?? "Falha ao criar conta"); return; }
    router.push("/dashboard"); router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta — Closer OS</CardTitle>
        <CardDescription>Comece seu segundo cérebro comercial</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Nome</Label><Input id="name" name="name" required placeholder="Seu nome" /></div>
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required placeholder="voce@empresa.com" /></div>
          <div className="space-y-2"><Label htmlFor="password">Senha (mín. 8)</Label><Input id="password" name="password" type="password" required minLength={8} /></div>
          <div className="space-y-2"><Label htmlFor="orgName">Organização (opcional)</Label><Input id="orgName" name="orgName" placeholder="Minha Empresa" /></div>
          {err && <p className="text-sm text-red-400 whitespace-pre-wrap">{err}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
          <p className="text-center text-sm text-zinc-400">Já tem conta? <Link href="/login" className="underline text-zinc-100">Entrar</Link></p>
        </form>
      </CardContent>
    </Card>
  );
}

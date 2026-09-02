"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n/provider";
import type { Locale } from "@/lib/i18n";

export function SettingsForms({ initial }:{ initial:{ user:{id:string,name:string,email:string,createdAt:Date,locale?:string}, org:{id:string,name:string,slug:string,createdAt:Date}, membership:{role:string}, memberCount:number, email:string } }){
  const { locale, setLocale } = useI18n();
  const [userName,setUserName]=useState(initial.user.name);
  const [orgName,setOrgName]=useState(initial.org.name);
  const [msg,setMsg]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [pw,setPw]=useState({ current:"", next:"", confirm:"" });
  const [pwMsg,setPwMsg]=useState<string|null>(null);
  const [pwLoading,setPwLoading]=useState(false);

  async function saveProfile(){
    setLoading(true); setMsg(null);
    const r=await fetch("/api/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ userName, orgName })});
    const j=await r.json().catch(()=>({}));
    setLoading(false);
    if(!r.ok){ setMsg(j.error ?? "Falha"); return; }
    setMsg("Salvo ✓"); setTimeout(()=>location.reload(),600);
  }
  async function changePw(){
    setPwLoading(true); setPwMsg(null);
    if(pw.next!==pw.confirm){ setPwMsg("Nova senha e confirmação não conferem"); setPwLoading(false); return; }
    if(pw.next.length<8){ setPwMsg("Senha mínima 8 caracteres"); setPwLoading(false); return; }
    const r=await fetch("/api/settings/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ currentPassword: pw.current, newPassword: pw.next })});
    const j=await r.json().catch(()=>({}));
    setPwLoading(false);
    if(!r.ok){ setPwMsg(j.error ?? "Falha"); return; }
    setPwMsg("Senha alterada ✓"); setPw({current:"",next:"",confirm:""});
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Conta</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-zinc-500">Email: <span className="text-zinc-200">{initial.user.email}</span> · Role: <Badge>{initial.membership.role}</Badge> · Membro desde {new Date(initial.user.createdAt).toLocaleDateString("pt-BR")}</div>
          <div className="space-y-1.5"><Label>Nome</Label><Input value={userName} onChange={e=>setUserName(e.target.value)} /></div>
          <Button size="sm" onClick={saveProfile} disabled={loading}>{loading?"Salvando...":"Salvar nome"}</Button>
          {msg && <p className="text-xs text-zinc-400">{msg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Organização</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-zinc-500">Slug: <span className="text-zinc-200">{initial.org.slug}</span> · {initial.memberCount} membro(s) · Criada {new Date(initial.org.createdAt).toLocaleDateString("pt-BR")}</div>
          <div className="space-y-1.5"><Label>Nome da organização</Label><Input value={orgName} onChange={e=>setOrgName(e.target.value)} /></div>
          <Button size="sm" onClick={saveProfile} disabled={loading}>{loading?"Salvando...":"Salvar organização"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Segurança — trocar senha</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Senha atual</Label><Input type="password" value={pw.current} onChange={e=>setPw({...pw,current:e.target.value})} /></div>
          <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" value={pw.next} onChange={e=>setPw({...pw,next:e.target.value})} /></div>
          <div className="space-y-1.5"><Label>Confirmar nova senha</Label><Input type="password" value={pw.confirm} onChange={e=>setPw({...pw,confirm:e.target.value})} /></div>
          <Button size="sm" onClick={changePw} disabled={pwLoading}>{pwLoading?"Alterando...":"Alterar senha"}</Button>
          {pwMsg && <p className="text-xs text-zinc-400">{pwMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Idioma / Language</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>Escolha / Choose</Label>
            <select value={locale} onChange={e=>setLocale(e.target.value as Locale)} className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm">
              <option value="pt-BR">Português (BR)</option>
              <option value="en">English</option>
            </select>
          </div>
          <p className="text-xs text-zinc-500">Salvo automaticamente no perfil e cookie. / Auto-saved to profile and cookie.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Sistema</CardTitle></CardHeader>
        <CardContent className="text-xs text-zinc-500 space-y-1">
          <div>App: Closer OS v0.1 — Next.js 16 · Prisma 6 · PostgreSQL</div>
          <div>Auth: JWT httpOnly cookie (7d) · Tenant isolado por organizationId</div>
          <div>Links: <a href="/api/health" className="text-sky-400 hover:underline">/api/health</a> · <a href="/api/ready" className="text-sky-400 hover:underline">/api/ready</a></div>
        </CardContent>
      </Card>
    </div>
  );
}

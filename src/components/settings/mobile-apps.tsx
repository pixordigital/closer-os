"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function MobileApps(){
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Apps Mobile — Android & iOS</CardTitle><p className="text-xs text-zinc-500">Use o Live Coach no tablet/celular sem extensão — stealth via mic + split-screen. PWA instalável + APK/IPA nativo.</p></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2"><span className="text-lg">🤖</span><span className="text-sm font-medium">Android</span><Badge>APK</Badge></div>
            <p className="mt-1 text-xs text-zinc-500">Capacitor wrapper com captura de áudio em background (Granola mobile). Funciona em tablet/celular sem Chrome extension.</p>
            <a href="/downloads/closer.apk" download className="mt-3 inline-flex h-9 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">Baixar APK</a>
            <p className="mt-2 text-[11px] text-zinc-600">Ou instale PWA: Chrome → ⋮ → Instalar app</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2"><span className="text-lg">🍎</span><span className="text-sm font-medium">iOS</span><Badge>IPA</Badge><Badge>TestFlight</Badge></div>
            <p className="mt-1 text-xs text-zinc-500">Mesmo wrapper iOS — WebView com Live Coach overlay. Distribuído via TestFlight.</p>
            <a href="/downloads/closer.ipa" download className="mt-3 inline-flex h-9 items-center rounded-md bg-zinc-800 px-4 text-sm font-medium text-zinc-200 border border-zinc-700 hover:bg-zinc-800">Baixar IPA</a>
            <p className="mt-2 text-[11px] text-zinc-600">Requer Xcode + Apple Developer — PWA já funciona hoje</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-400">
          <b className="text-zinc-200">Como usar no tablet sem extensão:</b> 1) Instale o APK/PWA, 2) Abra Meet no app nativo ou Chrome, 3) Abra Closer OS em split-screen (arraste), 4) Toque <b>Stealth</b> no Live Coach — captura via mic + speaker, invisível ao prospect, mesmo no Android. Sem precisar de computador.
        </div>
        <div className="flex gap-2 text-xs"><a href="/manifest.json" target="_blank" className="text-sky-400 hover:underline">manifest.json</a><span className="text-zinc-600">·</span><span className="text-zinc-500">PWA instalável em Android/iOS</span></div>
      </CardContent>
    </Card>
  );
}

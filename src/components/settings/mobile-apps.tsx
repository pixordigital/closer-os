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
            <div className="flex items-center gap-2"><span className="text-lg">🤖</span><span className="text-sm font-medium">Android</span><Badge>APK assinado v1</Badge><Badge>release</Badge><Badge>100% nativo</Badge></div>
            <p className="mt-1 text-xs text-zinc-500">Híbrido WebView (3.1MB) + <b>Nativo Kotlin Compose</b> (9.1MB) — sem WebView, buildado pra arm64. Play Protect ok.</p>
            <div className="flex gap-2 mt-3">
              <a href="/downloads/closer.apk" download className="inline-flex h-9 items-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">Baixar Híbrido</a>
              <a href="/downloads/closer-native.apk" download className="inline-flex h-9 items-center rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-700">Baixar Nativo Kotlin</a>
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">Nativo: Compose + Retrofit, sem WebView • PWA também funciona</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2"><span className="text-lg">🍎</span><span className="text-sm font-medium">iOS</span><Badge>IPA</Badge><Badge>TestFlight</Badge></div>
            <p className="mt-1 text-xs text-zinc-500">Mesmo wrapper iOS — WebView com Live Coach overlay. Distribuído via TestFlight.</p>
            <a href="/downloads/closer.ipa" download className="mt-3 inline-flex h-9 items-center rounded-md bg-zinc-800 px-4 text-sm font-medium text-zinc-200 border border-zinc-700 hover:bg-zinc-800">Baixar IPA</a>
            <p className="mt-2 text-[11px] text-zinc-600">Requer Xcode + Apple Developer — PWA já funciona hoje</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-400">
          <b className="text-zinc-200">Novo — /mobile-live:</b> Live Coach 30% à esquerda + Meet 70% à direita, mesma tela no Android/iOS via WebView nativo (allowNavigation). Sem trocar de app. No desktop use extensão.
        </div>
        <div className="flex gap-2 text-xs"><a href="/manifest.json" target="_blank" className="text-sky-400 hover:underline">manifest.json</a><span className="text-zinc-600">·</span><span className="text-zinc-500">PWA instalável em Android/iOS</span></div>
      </CardContent>
    </Card>
  );
}

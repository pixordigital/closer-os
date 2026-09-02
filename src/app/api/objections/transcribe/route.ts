import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: Request) {
  await requireTenant();
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Form inválido" }, { status: 400 });
  const file = form.get("file") as File | null;
  const text = form.get("text") as string | null;
  if (text?.trim()) return NextResponse.json({ transcript: text.trim(), source: "text" });
  if (!file) return NextResponse.json({ error: "Envie file ou text" }, { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY não configurado — cole transcript em texto" }, { status: 400 });

  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("model", "whisper-1");
  fd.append("language", "pt");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd as unknown as BodyInit,
  });
  if (!r.ok) return NextResponse.json({ error: "Whisper falhou", detail: await r.text() }, { status: 502 });
  const j = await r.json() as { text?: string };
  return NextResponse.json({ transcript: j.text ?? "", source: "whisper" });
}

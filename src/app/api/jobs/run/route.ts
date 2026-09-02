import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { runOneJob } from "@/lib/jobs";

export async function POST() {
  await requireTenant();
  const res = await runOneJob();
  if (!res) return NextResponse.json({ ok:true, ran:0 });
  return NextResponse.json({ ok:res.ok, ran:1, id: res.id });
}

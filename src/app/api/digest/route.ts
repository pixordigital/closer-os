import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { enqueueJob } from "@/lib/jobs";
import { buildDigest, next08h } from "@/lib/digest";

export async function GET(){
  const { organizationId } = await requireTenant();
  const d = await buildDigest(organizationId);
  return NextResponse.json(d);
}
export async function POST(){
  const { organizationId } = await requireTenant();
  const runAt = next08h();
  const job = await enqueueJob({ organizationId, type:"daily_digest" as never, payload:{ organizationId }, runAt });
  return NextResponse.json({ ok:true, jobId: job.id, runAt });
}

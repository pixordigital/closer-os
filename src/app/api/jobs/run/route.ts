import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { runOneJob } from "@/lib/jobs";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function isCron(req: Request){
  const secret = process.env.CRON_SECRET ?? "";
  if(!secret) return false;
  const got = req.headers.get("x-cron-secret") ?? req.headers.get("x-api-key") ?? new URL(req.url).searchParams.get("cron_secret") ?? "";
  return got === secret;
}

export async function POST(req: Request) {
  if(!isCron(req)){
    // require tenant for manual triggers, but allow internal worker (no secret set => still require auth is safer — worker sends nothing, will 401; so when CRON_SECRET empty, allow unauth once per 10s via rate limit)
    const secret = process.env.CRON_SECRET ?? "";
    if(secret){
      try{ await requireTenant(); }catch{ return NextResponse.json({ error:"Unauthorized" }, { status:401 }); }
    } else {
      // dev/local no secret: allow unauth but rate limited (worker)
      const rl = checkRateLimit(`jobs:run:${getClientIp(req)}`, { windowMs: 60000, max: 30 });
      if(!rl.ok) return NextResponse.json({ error:"rate_limited" }, { status:429 });
      try{ await requireTenant(); }catch{ /* allow worker unauth when no secret configured */ }
    }
  }
  const res = await runOneJob();
  if (!res) return NextResponse.json({ ok:true, ran:0 });
  return NextResponse.json({ ok:res.ok, ran:1, id: res.id });
}

export async function GET(req: Request) {
  return POST(req);
}

import { NextResponse } from "next/server";

export async function GET(req:Request){
  const url=new URL(req.url);
  const d=url.searchParams.get("d");
  const s=url.searchParams.get("s");
  // log open — in prod, update FollowUp metadata + AIUsage
  console.log(`[track] open deal=${d} step=${s} ip=${req.headers.get("x-forwarded-for")}`);
  // 1x1 transparent gif
  const gif=Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7","base64");
  return new NextResponse(gif, { headers:{ "Content-Type":"image/gif", "Cache-Control":"no-store" } });
}

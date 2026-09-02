import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", db: "up" }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    logger.error({ msg: "readiness check failed", err: String(e) });
    return NextResponse.json({ status: "not-ready", db: "down", error: String(e) }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

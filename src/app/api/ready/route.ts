import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", db: "up" });
  } catch (e) {
    return NextResponse.json({ status: "not-ready", db: "down", error: String(e) }, { status: 503 });
  }
}

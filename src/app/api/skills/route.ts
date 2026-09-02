import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  const { userId } = await requireTenant();
  const [skills, recentScores] = await Promise.all([
    prisma.sellerSkill.findMany({ where: { userId }, orderBy: { skill: "asc" } }),
    prisma.roleplayScore.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  // group recent scores by skill for sparkline (last 8 per skill, chronological)
  const bySkill = new Map<string, number[]>();
  for (const r of [...recentScores].reverse()) {
    const arr = bySkill.get(r.skill) ?? [];
    arr.push(r.score);
    if (arr.length > 8) arr.shift();
    bySkill.set(r.skill, arr);
  }

  const items = skills.map((s) => {
    const hist = bySkill.get(s.skill) ?? [];
    let trend: "up" | "down" | "stable" = "stable";
    if (hist.length >= 2) {
      const last = hist[hist.length - 1];
      const prev = hist[hist.length - 2];
      if (last > prev + 2) trend = "up";
      else if (last < prev - 2) trend = "down";
    }
    return { ...s, trend: (s as unknown as { trend?: string }).trend ?? trend, history: hist };
  });

  // include skills that have scores but no SellerSkill row yet (edge after seed)
  for (const [skill, hist] of bySkill) {
    if (!items.find((x) => x.skill === skill)) {
      const last = hist[hist.length - 1] ?? 0;
      items.push({ id: `virtual-${skill}`, userId, skill, currentScore: last, targetScore: null, trend: "stable", confidence: null, sampleSize: hist.length, createdAt: new Date(), updatedAt: new Date(), history: hist } as never);
    }
  }

  return NextResponse.json({ items });
}

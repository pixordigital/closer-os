import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/db";
import { CoachingPanel } from "@/components/ai/coaching-panel";
import { ProfileForm } from "@/components/coaching/profile-form";
import { SkillsPanel } from "@/components/coaching/skills-panel";
import { TrainingPlanner } from "@/components/coaching/training-planner";

export default async function CoachingPage() {
  const { organizationId, userId } = await requireTenant();
  const [sessions, recs, profile, plans] = await Promise.all([
    prisma.coachingSession.findMany({ where: { organizationId, userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.aIRecommendation.findMany({ where: { organizationId, userId, type: "coaching" }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.sellerProfile.findUnique({ where: { userId } }),
    prisma.trainingPlan.findMany({ where: { organizationId, userId }, orderBy: { createdAt: "desc" }, include: { trainingExercises: true }, take: 10 }),
  ]);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coaching</h1>
        <p className="mt-1 text-sm text-zinc-400">Personal Coach — profile, skills, longitudinal coaching e training planner.</p>
      </div>

      <ProfileForm initial={profile as never} />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="font-medium">Skills (§70)</h2>
        <p className="mt-1 text-xs text-zinc-500">14 skills · score 0-100 · sparkline por skill · fonte taggeada (roleplay vs real_call em RoleplayScore).</p>
        <div className="mt-4"><SkillsPanel /></div>
      </section>

      <CoachingPanel />

      {sessions.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Coaching Sessions ({sessions.length})</h2>
          <div className="mt-3 space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-xs text-zinc-500">{new Date(s.createdAt).toLocaleString("pt-BR")} · {s.periodStart ? new Date(s.periodStart).toLocaleDateString("pt-BR") : ""} → {s.periodEnd ? new Date(s.periodEnd).toLocaleDateString("pt-BR") : ""}</div>
                <p className="mt-1 text-sm text-zinc-200">{s.summary ?? "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="font-medium">Recommendations</h2>
          <div className="mt-3 space-y-2">
            {recs.map((r) => (
              <div key={r.id} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-sm text-zinc-100">{r.title}</div>
                {r.reason && <div className="text-xs text-zinc-500">{r.reason}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <TrainingPlanner initialPlans={plans as never} />
      </section>
    </div>
  );
}

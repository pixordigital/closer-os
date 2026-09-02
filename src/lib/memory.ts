import { prisma } from "./db";

// §79 Personal Sales Memory — text chunks for semantic + Ask
export type MemoryChunk = { id: string; kind: string; title: string; text: string; href: string; createdAt?: Date };

export async function collectMemoryChunks(organizationId: string, limitPerKind = 30): Promise<MemoryChunk[]> {
  const [companies, contacts, deals, calls, txs, scenarios] = await Promise.all([
    prisma.company.findMany({ where: { organizationId }, take: limitPerKind, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, industry: true, description: true, notes: true, createdAt: true } }),
    prisma.contact.findMany({ where: { organizationId }, take: limitPerKind, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, role: true, email: true, notes: true, companyId: true, createdAt: true } }),
    prisma.deal.findMany({ where: { organizationId }, take: limitPerKind, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, stage: true, painSummary: true, desiredOutcome: true, nextStep: true, createdAt: true } }),
    prisma.call.findMany({ where: { organizationId }, take: limitPerKind, orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, dealId: true, createdAt: true } }),
    prisma.transcript.findMany({ where: { call: { organizationId } }, take: limitPerKind, orderBy: { createdAt: "desc" }, select: { callId: true, content: true, createdAt: true } }),
    prisma.roleplayScenario.findMany({ where: { OR: [{ organizationId }, { organizationId: null }] }, take: limitPerKind, select: { id: true, title: true, persona: true, publicContext: true, trainingObjective: true, createdAt: true } }),
  ]);

  const chunks: MemoryChunk[] = [];
  for (const c of companies) chunks.push({ id: c.id, kind: "company", title: c.name, text: [c.name, c.industry, c.description, c.notes].filter(Boolean).join(" — ").slice(0, 800), href: `/companies/${c.id}`, createdAt: c.createdAt });
  for (const c of contacts) chunks.push({ id: c.id, kind: "contact", title: c.name, text: [c.name, c.role, c.email, c.notes].filter(Boolean).join(" — ").slice(0, 800), href: `/contacts/${c.id}`, createdAt: c.createdAt });
  for (const d of deals) chunks.push({ id: d.id, kind: "deal", title: d.name, text: [d.name, d.stage, d.painSummary, d.desiredOutcome, d.nextStep].filter(Boolean).join(" — ").slice(0, 800), href: `/deals/${d.id}`, createdAt: d.createdAt });
  for (const c of calls) chunks.push({ id: c.id, kind: "call", title: c.title, text: [c.title, c.status].join(" — "), href: `/calls/${c.id}`, createdAt: c.createdAt });
  for (const t of txs) chunks.push({ id: t.callId, kind: "transcript", title: `Transcript ${t.callId.slice(0,6)}`, text: t.content.slice(0, 800), href: `/calls/${t.callId}`, createdAt: t.createdAt });
  for (const s of scenarios) chunks.push({ id: s.id, kind: "roleplay", title: s.title, text: [s.title, s.persona, s.publicContext, s.trainingObjective].filter(Boolean).join(" — ").slice(0, 800), href: `/roleplay/${s.id}`, createdAt: s.createdAt as Date });
  return chunks;
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

// semantic rank via provider.embed; falls back to lexical overlap if embed unavailable
export async function semanticRank(query: string, chunks: MemoryChunk[], embedFn: (texts: string[]) => Promise<number[][]>, topK = 8) {
  if (!query.trim() || chunks.length === 0) return chunks.slice(0, topK).map(c=>({ chunk: c, score: 0 }));
  try {
    const [qEmb, cEmbs] = await Promise.all([
      embedFn([query]).then(r=>r[0]),
      embedFn(chunks.map(c=>`${c.title} ${c.text}`.slice(0, 1000))),
    ]);
    const scored = chunks.map((c, i) => ({ chunk: c, score: cosine(qEmb, cEmbs[i]) }));
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0, topK);
  } catch {
    // lexical fallback
    const q = query.toLowerCase();
    const scored = chunks.map(c=>{
      const hay = `${c.title} ${c.text}`.toLowerCase();
      const score = q.split(/\s+/).filter(w=>w.length>2 && hay.includes(w)).length / (q.split(/\s+/).length || 1);
      return { chunk: c, score };
    });
    scored.sort((a,b)=>b.score-a.score);
    return scored.slice(0, topK);
  }
}

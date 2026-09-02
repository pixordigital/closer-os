import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("closer123", 10);

  // Demo user + org
  const user = await prisma.user.upsert({
    where: { email: "demo@closer.os" },
    update: {},
    create: { email: "demo@closer.os", name: "Demo Closer", passwordHash },
  });

  let org = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: "Demo Org", slug: "demo-org" } });
  }
  // Ensure membership
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });

  // Ensure seller profile
  await prisma.sellerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      sellingStyle: "Consultative",
      targetMarket: "B2B SaaS / Mid-market",
      targetTicket: "R$ 20k–80k",
    },
  });

  // Companies
  const companies = [];
  for (const c of [
    { name: "Acme SaaS", industry: "SaaS", companySize: "51-200", location: "São Paulo, SP" },
    { name: "Nordic Logística", industry: "Logística", companySize: "201-1000", location: "Curitiba, PR" },
    { name: "Helios Energia", industry: "Energia", companySize: "11-50", location: "Belo Horizonte, MG" },
  ]) {
    const existing = await prisma.company.findFirst({ where: { organizationId: org.id, name: c.name } });
    if (existing) { companies.push(existing); continue; }
    companies.push(await prisma.company.create({ data: { organizationId: org.id, ...c } }));
  }

  // Contacts
  const contactsData = [
    { companyId: companies[0].id, name: "Marina Duarte", role: "CFO", email: "marina@acme.test", decisionRole: "DECISION_MAKER" as const },
    { companyId: companies[0].id, name: "Rafael Lima", role: "Head de Vendas", email: "rafael@acme.test", decisionRole: "CHAMPION" as const },
    { companyId: companies[1].id, name: "Klaus Hansen", role: "COO", email: "klaus@nordic.test", decisionRole: "DECISION_MAKER" as const },
    { companyId: companies[1].id, name: "Ana Paula", role: "Gerente de Operações", email: "ana@nordic.test", decisionRole: "INFLUENCER" as const },
    { companyId: companies[2].id, name: "Fernanda Reis", role: "Diretora Comercial", email: "fernanda@helios.test", decisionRole: "CHAMPION" as const },
  ];
  const contacts = [];
  for (const cd of contactsData) {
    const ex = await prisma.contact.findFirst({ where: { organizationId: org.id, email: cd.email } });
    if (ex) { contacts.push(ex); continue; }
    contacts.push(await prisma.contact.create({ data: { organizationId: org.id, ...cd } }));
  }

  // Deals
  const dealsData = [
    { companyId: companies[0].id, primaryContactId: contacts[0].id, name: "Acme — Automação Comercial", stage: "DISCOVERY" as const, value: 45000, probability: 30, painSummary: "Perda de 30 leads/mês por follow-up manual" },
    { companyId: companies[0].id, primaryContactId: contacts[1].id, name: "Acme — Expansão CRM", stage: "QUALIFIED" as const, value: 28000, probability: 45 },
    { companyId: companies[1].id, primaryContactId: contacts[2].id, name: "Nordic — Roteirização", stage: "PROPOSAL" as const, value: 72000, probability: 60 },
    { companyId: companies[1].id, primaryContactId: contacts[3].id, name: "Nordic — WMS Lite", stage: "LEAD" as const, value: 35000, probability: 15 },
    { companyId: companies[2].id, primaryContactId: contacts[4].id, name: "Helios — Pipeline Solar", stage: "NEGOTIATION" as const, value: 120000, probability: 75 },
  ];
  const deals = [];
  for (const dd of dealsData) {
    const ex = await prisma.deal.findFirst({ where: { organizationId: org.id, name: dd.name } });
    if (ex) { deals.push(ex); continue; }
    deals.push(await prisma.deal.create({ data: { organizationId: org.id, currency: "BRL", ...dd } as never }));
  }

  // Calls + Transcripts
  const txDemo = `Vendedor: Olá Marina, obrigado pelo tempo hoje. Me conta um pouco do contexto de vocês em vendas?\nProspect: Olha, a gente perde cerca de 30 leads por mês. O time não consegue fazer follow-up consistente.\nVendedor: Entendo. E vocês já tentaram automatizar isso?\nProspect: Tentamos uma ferramenta, mas o time não adotou. O problema é processo.\nVendedor: Legal, deixa eu te mostrar como o Closer OS resolve isso...`;
  for (let i = 0; i < 3; i++) {
    const deal = deals[i % deals.length];
    const call = await prisma.call.create({
      data: {
        organizationId: org.id, dealId: deal.id, title: `Call ${i + 1} — ${deal.name}`,
        status: "COMPLETED", analysisStatus: "PENDING",
      },
    });
    await prisma.transcript.create({ data: { callId: call.id, content: txDemo, language: "pt-BR" } });
  }

  // Roleplay scenarios
  const scenarios = [
    { title: "CFO — SaaS 50-200 (Nível 4)", persona: "CFO", difficulty: "LEVEL_4" as const, industry: "SaaS", companySize: "51-200", ticket: "R$ 45k", publicContext: "Empresa SaaS em crescimento, avaliando automação comercial.", hiddenContext: { realProblem: "Perda de 30 leads/mês", monthlyImpact: "R$ 30.000", urgency: "Alta", decisionMaker: "CEO+CFO", budget: "R$ 20k", mainObjection: "Risco de implementação", buyingProbability: "65%" }, trainingObjective: "Discovery — Quantificar impacto" },
    { title: "CEO — Logística Enterprise", persona: "CEO", difficulty: "LEVEL_3" as const, industry: "Logística", companySize: "201-1000", ticket: "R$ 80k", publicContext: "Operadora logística com frota própria, dor operacional difusa.", hiddenContext: { realProblem: "Atrasos recorrentes", monthlyImpact: "R$ 50.000", urgency: "Média", decisionMaker: "COO", budget: "R$ 35k" }, trainingObjective: "Discovery — Causa e consequência" },
    { title: "Diretora Comercial — Energia", persona: "Diretora Comercial", difficulty: "LEVEL_2" as const, industry: "Energia", companySize: "11-50", ticket: "R$ 25k", publicContext: "Comercial de energia solar, pipeline desorganizado.", hiddenContext: { realProblem: "Pipeline sem next step", monthlyImpact: "R$ 15.000", urgency: "Baixa", decisionMaker: "Diretora", budget: "R$ 15k" }, trainingObjective: "Next Step e Fechamento" },
    { title: "CTO — SaaS Early Stage", persona: "CTO", difficulty: "LEVEL_5" as const, industry: "SaaS", companySize: "11-50", ticket: "R$ 60k", publicContext: "CTO cético, já usa concorrente forte.", hiddenContext: { realProblem: "Integração frágil", monthlyImpact: "R$ 40.000", urgency: "Alta", decisionMaker: "CTO+CEO", budget: "R$ 25k" }, trainingObjective: "Objeção — Concorrência" },
    { title: "BOSS — Enterprise 4 Stakeholders", persona: "CFO", difficulty: "BOSS" as const, industry: "SaaS", companySize: "201-1000", ticket: "R$ 120k", publicContext: "Deal enterprise, 4 stakeholders, CFO resistente, CEO interessado.", hiddenContext: { realProblem: "Conversão baixa + churn", monthlyImpact: "R$ 120.000", urgency: "Média", decisionMaker: "CEO+CFO+COO", budget: "Limitado", mainObjection: "Preço + risco", competitor: "Market Leader" }, trainingObjective: "Negociação Complexa" },
  ];
  for (const s of scenarios) {
    const ex = await prisma.roleplayScenario.findFirst({ where: { title: s.title } });
    if (ex) continue;
    await prisma.roleplayScenario.create({
      data: {
        organizationId: org.id, title: s.title, persona: s.persona, difficulty: s.difficulty,
        industry: s.industry, companySize: s.companySize, ticket: s.ticket,
        publicContext: s.publicContext, hiddenContext: s.hiddenContext as never,
        trainingObjective: s.trainingObjective, objections: ["Preço", "Temos fornecedor", "Preciso falar com sócio"] as never,
      },
    });
  }

  console.log(`Seed done: user=${user.email} org=${org.slug} companies=${companies.length} deals=${deals.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

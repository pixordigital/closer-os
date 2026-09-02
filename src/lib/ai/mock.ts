import type { AIProvider, GenerateTextOpts, GenerateStructuredOpts } from "./provider";

const MOCK_PRE_CALL = {
  companySummary: "Empresa B2B em crescimento avaliando automação comercial. [Mock — sem chave OpenAI configurada]",
  contactSummary: "Contato decisor/influenciador mapeado parcialmente.",
  dealContext: "Deal em discovery com dor de follow-up manual.",
  knownContext: ["Empresa tem 50-200 colaboradores", "Stack atual manual/legado"],
  previousInteractions: ["Call discovery inicial — 30 leads/mês perdidos"],
  painHypotheses: [{ hypothesis: "Follow-up inconsistente causa perda de pipeline", evidence: "Transcript: 30 leads/mês", confidence: 0.72 }],
  businessImpact: "R$ 30k/mês em pipeline perdido estimado.",
  questionsToInvestigate: ["Qual volume real de leads/mês?", "Qual taxa de conversão atual?", "Quem decide compra?"],
  potentialObjections: ["Preço", "Temos fornecedor", "Preciso falar com sócio"],
  decisionMakers: "CFO + Head de Vendas (confirmar CEO)",
  callObjective: "Quantificar impacto e mapear processo decisório.",
  risks: ["Sem decisor confirmado", "Sem urgência mapeada"],
  nextQuestions: ["O que acontece se nada mudar em 90 dias?", "Quanto custa cada lead perdido?"],
};

const MOCK_ANALYZE = {
  discoveryUpdates: [
    { key: "problem", status: "PARTIAL", value: "Perda de 30 leads/mês por follow-up manual", confidence: 0.85, evidence: "Prospect: perde cerca de 30 leads por mês" },
    { key: "impact", status: "PARTIAL", value: "R$ 30k/mês pipeline", confidence: 0.6, evidence: "Inferência — sem valor confirmado" },
    { key: "cause", status: "PARTIAL", value: "Processo manual sem automação", confidence: 0.75, evidence: "Prospect: o problema é processo" },
  ],
  insights: [
    { type: "missed_opportunity", title: "Não quantificou impacto financeiro", evidence: "Seller pulou pergunta de impacto após dor", confidence: 0.82, whyItMatters: "Sem impacto não há urgência", recommendedAction: "Pergunte: quanto vale cada lead?" },
    { type: "discovery_gap", title: "Decision maker não confirmado", evidence: "Nenhuma pergunta sobre quem decide", confidence: 0.9, whyItMatters: "Risco de no-decision", recommendedAction: "Mapeie DM e processo" },
  ],
  overallScore: 58,
};

const MOCK_FOLLOW_UP = {
  drafts: [
    { type: "EMAIL", subject: "Próximos passos — Closer OS", content: "Olá {{nome}}, obrigado pela conversa. Combinamos: mapear impacto financeiro e validar decisores. Segue resumo e próximo passo sugerido. Quando podemos confirmar?" },
    { type: "WHATSAPP", content: "Oi {{nome}}! Obrigado pelo papo hoje. Próximo passo: quantificar impacto. Te envio resumo por e-mail. Topa 30 min quinta?" },
    { type: "CRM_NOTE", content: "Call discovery: dor 30 leads/mês, causa processo manual, sem DM confirmado. Next: quantificar impacto e mapear decisão." },
    { type: "INTERNAL_SUMMARY", content: "Resumo interno: prospect perde 30 leads/mês, tentou ferramenta sem adoção. Seller apresentou solução cedo. Faltou quantificar e mapear DM." },
  ],
};

const MOCK_COACHING = {
  summary: "Nas últimas calls você identificou dor mas quantificou impacto em apenas 20% delas. Padrão: pitch precoce.",
  strengths: ["Boa escuta inicial", "Empatia com dor do prospect"],
  weaknesses: ["Impacto não quantificado", "Decision maker não mapeado"],
  trends: ["Discovery health médio 38% — abaixo do ideal 75%"],
  recommendations: ["Treino: Quantify Impact (Level 3)", "Pergunte sempre: o que acontece se nada mudar?"],
};

const MOCK_ROLEPLAY_EVAL = {
  overallScore: 62,
  skills: { discovery: 58, listening: 65, impactQuantification: 45, objectionHandling: 60, closing: 55, questioning: 60 },
  strengths: ["Boa abertura", "Escuta ativa em 2 momentos"],
  weaknesses: ["Não quantificou impacto", "Não mapeou decisor"],
  decisiveMoments: [{ prospectStatement: "Perdemos leads todo mês", whatWasMissed: "Não quantificou valor", recommendedQuestion: "Quanto vale cada lead perdido?", severity: "high" as const }],
  errorTypes: ["missed_impact", "no_dm"],
  recommendedExercises: ["Discovery Drill — Impact", "Executive Roleplay Level 3"],
};

const MOCK_PROSPECT_REPLIES = [
  "Entendo, mas nosso time já tentou algo parecido e não funcionou. Por que seria diferente agora?",
  "Isso parece interessante, mas preciso entender o ROI. Quanto tempo até ver retorno?",
  "Olha, o budget está apertado este trimestre. Como vocês justificam o investimento?",
  "Quem mais precisaria aprovar isso internamente? Não decido sozinho.",
  "E se nada mudar? Hoje a dor existe, mas não está travando a operação. Por que priorizar agora?",
];

export class MockProvider implements AIProvider {
  readonly name = "mock";
  async generateText(opts: GenerateTextOpts): Promise<string> {
    const p = (opts.system ?? "") + " " + opts.prompt;
    const low = p.toLowerCase();
    if (low.includes("prospect") || low.includes("roleplay") || low.includes("hiddencontext") || low.includes("persona")) {
      const lastUser = opts.prompt.slice(-300).toLowerCase();
      if (lastUser.includes("preço") || lastUser.includes("valor") || lastUser.includes("budget")) return "Preço é uma preocupação real aqui. Nosso CFO vai questionar — qual o payback? E se não tivermos budget aprovado?";
      if (lastUser.includes("quem") || lastUser.includes("decide") || lastUser.includes("aprova")) return "Normalmente eu e o CFO decidimos juntos, mas o CEO dá a palavra final em investimentos acima de R$ 30k.";
      return MOCK_PROSPECT_REPLIES[Math.floor(Math.random() * MOCK_PROSPECT_REPLIES.length)] + " [mock prospect]";
    }
    return `[mock:${opts.prompt.slice(0, 80)}]`;
  }
  async generateStructured<T>(opts: GenerateStructuredOpts<T>): Promise<T> {
    const p = (opts.system ?? "") + " " + opts.prompt;
    const low = p.toLowerCase();
    let raw: unknown;
    if (low.includes("decisivemoments") || low.includes("overallscore") || low.includes("avali") || low.includes("evaluation") || low.includes("roleplay") && low.includes("skills")) raw = MOCK_ROLEPLAY_EVAL;
    else if (low.includes("pre-call") || low.includes("pre_call") || low.includes("brief")) raw = MOCK_PRE_CALL;
    else if (low.includes("analyze") || low.includes("transcript") || low.includes("discoveryupdates")) raw = MOCK_ANALYZE;
    else if (low.includes("follow-up") || low.includes("followup") || low.includes("drafts")) raw = MOCK_FOLLOW_UP;
    else if (low.includes("coach")) raw = MOCK_COACHING;
    else raw = MOCK_PRE_CALL;
    // validate via schema if provided, else cast
    try {
      return opts.schema.parse(raw) as T;
    } catch {
      // fallback: try to coerce by returning raw as T
      return raw as T;
    }
  }
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(() => Array(1536).fill(0));
  }
}

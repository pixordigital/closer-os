export type ObjectionCat = "PRICE"|"TIMING"|"AUTHORITY"|"TRUST"|"COMPETITION"|"STATUS_QUO"|"NEED"|"PRIORITY"|"IMPLEMENTATION"|"RISK"|"INTERNAL_APPROVAL";

export const PLAYBOOK: Record<ObjectionCat, { label:string, patterns:RegExp[], suggestion:string, question:string }> = {
  PRICE: { label:"Preço", patterns:[/caro/i,/preço/i,/orçamento/i,/budget/i,/custo/i,/investimento/i,/barato/i], suggestion:"Ancorar no ROI: quantifique impacto mensal antes de falar preço. Use quebra: 'Se isso resolve R$ X/mês, qual valor faz sentido?'", question:"'Quanto custa não resolver isso por mês?'" },
  TIMING: { label:"Timing", patterns:[/agora não/i,/depois/i,/próximo trimestre/i,/sem tempo/i,/prioridade agora/i,/mais tarde/i], suggestion:"Isolar timing: é prioridade ou dúvida? Compromisso pequeno hoje trava preço/escopo.", question:"'Se timing fosse perfeito em 30 dias, o que precisaria acontecer?'" },
  AUTHORITY: { label:"Autoridade", patterns:[/preciso falar com/i,/sócio/i,/diretor/i,/decisor/i,/aprovação/i,/comitê/i], suggestion:"Mapear DM: quem decide, critério e processo. Convide decisor para próxima call.", question:"'Quem mais além de você avalia? Como decidem?'" },
  TRUST: { label:"Confiança", patterns:[/não conheço/i,/referência/i,/case/i,/prova/i,/funciona/i,/garantia/i], suggestion:"Prova social + micro-compromisso. Case similar + piloto curto.", question:"'O que te daria segurança para testar?'" },
  COMPETITION: { label:"Concorrência", patterns:[/concorrente/i,/outro fornecedor/i,/ferramenta atual/i,/já uso/i,/comparando/i], suggestion:"Diferencie no impacto, não feature. Pergunte o que falta no atual.", question:"'O que te faria trocar mesmo satisfeito?'" },
  STATUS_QUO: { label:"Status quo", patterns:[/tá bom assim/i,/funciona hoje/i,/sem dor/i,/não é prioridade/i,/deixa como está/i], suggestion:"Amplificar dor: custo de manter vs mudar. Quantifique perda.", question:"'O que acontece se nada mudar em 6 meses?'" },
  NEED: { label:"Necessidade", patterns:[/não preciso/i,/não é problema/i,/não vejo valor/i], suggestion:"Voltar ao discovery: qual consequência real da dor?", question:"'O que te fez aceitar essa conversa hoje?'" },
  PRIORITY: { label:"Prioridade", patterns:[/outras prioridades/i,/foco em/i,/não é foco/i], suggestion:"Conectar à meta #1 do trimestre.", question:"'Como isso ajuda sua meta principal?'" },
  IMPLEMENTATION: { label:"Implementação", patterns:[/implementar/i,/tempo de setup/i,/integração/i,/time não adota/i,/complexo/i], suggestion:"Reduzir risco: onboarding assistido + 2 semanas para valor.", question:"'O que tornaria a adoção simples?'" },
  RISK: { label:"Risco", patterns:[/risco/i,/medo/i,/se não der/i,/e se falhar/i], suggestion:"Inverter risco: garantia ou saída fácil.", question:"'O que precisa ser verdade para ser risco baixo?'" },
  INTERNAL_APPROVAL: { label:"Aprovação interna", patterns:[/compras/i,/jurídico/i,/aprov/i,/processo interno/i], suggestion:"Co-criar plano de aprovação com datas.", question:"'Qual o passo interno que mais atrasa?'" },
};

export function detectObjection(text:string): { cat:ObjectionCat, label:string } | null {
  for(const [cat, v] of Object.entries(PLAYBOOK) as [ObjectionCat, typeof PLAYBOOK[ObjectionCat]][]){
    if(v.patterns.some(r=>r.test(text))) return { cat, label: v.label };
  }
  return null;
}
export function suggestionFor(cat:ObjectionCat){
  return PLAYBOOK[cat];
}

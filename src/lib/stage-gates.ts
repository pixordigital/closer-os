import { computeHealth } from "./discovery";

// ponytail: 1 guard central — menor diff que guard em cada caller
export type GateResult = { ok: true } | { ok: false; message: string };

export const STAGE_ORDER = [
  "LEAD","QUALIFIED","DISCOVERY","SOLUTION","PROPOSAL","NEGOTIATION","VERBAL_COMMITMENT","WON","LOST",
] as const;

type DealLike = {
  value?: unknown; currency?: unknown; probability?: unknown;
  expectedCloseDate?: unknown; primaryContactId?: unknown;
  nextStep?: unknown; lostReason?: unknown;
};

export function validateStageGate(
  targetStage: string,
  deal: DealLike,
  opts?: { discoveryHealth?: number }
): GateResult {
  const s = targetStage.toUpperCase();
  const missing: string[] = [];

  const has = (k: keyof DealLike) => {
    const v = deal[k];
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  };

  // LOST sempre exige motivo — aprendizado
  if (s === "LOST") {
    if (!has("lostReason")) return { ok:false, message: "Para mover para LOST: informe o motivo da perda (lostReason)." };
    return { ok:true };
  }
  if (s === "WON") {
    if (!has("value")) missing.push("valor (value)");
    if (!has("expectedCloseDate")) missing.push("data de fechamento (expectedCloseDate)");
    if (missing.length) return { ok:false, message: `Para mover para WON: preencha ${missing.join(", ")}.` };
    return { ok:true };
  }
  if (s === "SOLUTION") {
    if (!has("value")) missing.push("valor");
    if (!has("expectedCloseDate")) missing.push("data de fechamento");
    if (!has("primaryContactId")) missing.push("contato principal");
    if (missing.length) return { ok:false, message: `Para mover para SOLUTION: preencha ${missing.join(", ")}.` };
    return { ok:true };
  }
  if (s === "PROPOSAL") {
    if (!has("value")) missing.push("valor");
    if (!has("probability")) missing.push("probabilidade");
    if (missing.length) return { ok:false, message: `Para mover para PROPOSAL: preencha ${missing.join(", ")}.` };
    if (opts?.discoveryHealth != null && opts.discoveryHealth < 45) {
      return { ok:false, message: `Para mover para PROPOSAL: discovery health ${opts.discoveryHealth}% < 45%. Complete o discovery.` };
    }
    return { ok:true };
  }
  if (s === "NEGOTIATION") {
    if (!has("probability")) missing.push("probabilidade");
    if (!has("value")) missing.push("valor");
    if (missing.length) return { ok:false, message: `Para mover para NEGOTIATION: preencha ${missing.join(", ")}.` };
    return { ok:true };
  }
  if (s === "VERBAL_COMMITMENT") {
    if (!has("probability")) missing.push("probabilidade");
    const prob = typeof deal.probability === "number" ? deal.probability : Number(deal.probability);
    if (!isNaN(prob) && prob < 60) return { ok:false, message: `Para VERBAL_COMMITMENT: probabilidade deve ser >= 60% (atual ${prob}%).` };
    if (missing.length) return { ok:false, message: `Para mover para VERBAL_COMMITMENT: preencha ${missing.join(", ")}.` };
    return { ok:true };
  }
  // LEAD, QUALIFIED, DISCOVERY — sem gate (entrada livre)
  return { ok:true };
}

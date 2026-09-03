import { prisma } from "@/lib/db";

type Cfg = {
  maxPerMinute: number; maxPerHour: number; maxPerDay: number;
  minDelayMs: number; maxDelayMs: number;
  warmupDays: number; warmupStart: number;
  typingMsPerChar: number;
};

const DEFAULT: Cfg = {
  maxPerMinute: 8, maxPerHour: 80, maxPerDay: 600,
  minDelayMs: 1200, maxDelayMs: 4200,
  warmupDays: 14, warmupStart: 30,
  typingMsPerChar: 38,
};

export function cfgFor(instanceCreatedAt?: Date): Cfg {
  if(!instanceCreatedAt) return DEFAULT;
  const days = (Date.now()-instanceCreatedAt.getTime())/86400000;
  if(days >= DEFAULT.warmupDays) return DEFAULT;
  const factor = 0.35 + 0.65 * (days/DEFAULT.warmupDays);
  return { ...DEFAULT, maxPerHour: Math.floor(DEFAULT.maxPerHour*factor), maxPerDay: Math.floor(DEFAULT.maxPerDay*factor), maxPerMinute: Math.max(2, Math.floor(DEFAULT.maxPerMinute*factor)) };
}

export function randomDelay(cfg: Cfg): number {
  return Math.floor(cfg.minDelayMs + Math.random()*(cfg.maxDelayMs - cfg.minDelayMs));
}

export function typingDelay(text:string, cfg: Cfg): number {
  return Math.min(8000, Math.max(1200, text.length * cfg.typingMsPerChar + randomDelay(cfg)/2));
}

function spintax(text:string): string {
  return text.replace(/\{([^{}]+)\}/g, (_, opts:string)=> opts.split("|")[Math.floor(Math.random()*opts.split("|").length)] );
}

export function humanize(text:string): string {
  let t = spintax(text);
  // tiny typos 2% then immediate correction is too risky for sales — keep clean, just vary punctuation
  if(Math.random()<0.3) t = t.replace(/!+/, "!");
  return t;
}

export async function checkLimits(organizationId:string, instance:string, now=Date.now()){
  const cfg = DEFAULT; // could load per-instance createdAt from DB
  const hourAgo = new Date(now - 3600000);
  const dayAgo = new Date(now - 86400000);
  const minuteAgo = new Date(now - 60000);
  const [cMinute, cHour, cDay] = await Promise.all([
    prisma.auditLog.count({ where:{ organizationId, action:"whatsapp.sent", createdAt:{ gte: minuteAgo } } }),
    prisma.auditLog.count({ where:{ organizationId, action:"whatsapp.sent", createdAt:{ gte: hourAgo } } }),
    prisma.auditLog.count({ where:{ organizationId, action:"whatsapp.sent", createdAt:{ gte: dayAgo } } }),
  ]);
  if(cMinute >= cfg.maxPerMinute) return { ok:false, reason:`Limite ${cfg.maxPerMinute}/min atingido (${cMinute}) — antiban`, retryMs: 60000 };
  if(cHour >= cfg.maxPerHour) return { ok:false, reason:`Limite ${cfg.maxPerHour}/h atingido — antiban`, retryMs: 60000*10 };
  if(cDay >= cfg.maxPerDay) return { ok:false, reason:`Limite ${cfg.maxPerDay}/dia — antiban`, retryMs: 60000*60 };
  return { ok:true, cfg };
}

export async function logSent(organizationId:string, instance:string, to:string){
  await prisma.auditLog.create({ data:{ organizationId, action:"whatsapp.sent", entityType:"WhatsApp", entityId: instance, metadata:{ to } as never } as never });
}

export const ANTIBAN_TIPS = [
  "Aqueça número 14 dias: comece 30 msgs/dia → 600/dia",
  "Varie texto com {olá|oi|opa} e delay 1.2-4.2s + typing",
  "Nunca envie +8/min ou 80/h — sistema bloqueia",
  "Use Evolution + Baileys com QR estável, não troque SIM",
  "Separe instâncias por closer — não compartilhe número",
];

import { z } from "zod";
import { DISCOVERY_KEYS } from "@/lib/discovery";

// Pre-call brief — §31
export const preCallBriefSchema = z.object({
  companySummary: z.string().min(1),
  contactSummary: z.string().min(1),
  dealContext: z.string().min(1),
  knownContext: z.array(z.string()).default([]),
  previousInteractions: z.array(z.string()).default([]),
  painHypotheses: z.array(z.object({
    hypothesis: z.string().min(1),
    evidence: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1),
  })).default([]),
  businessImpact: z.string().min(1),
  questionsToInvestigate: z.array(z.string()).default([]),
  potentialObjections: z.array(z.string()).default([]),
  decisionMakers: z.string().min(1),
  callObjective: z.string().min(1),
  risks: z.array(z.string()).default([]),
  nextQuestions: z.array(z.string()).default([]),
});
export type PreCallBrief = z.infer<typeof preCallBriefSchema>;

// Analyze transcript — discovery updates + insights (§32-§34)
const discoveryKeyEnum = z.enum(DISCOVERY_KEYS as unknown as [string, ...string[]]);
export const analyzeSchema = z.object({
  discoveryUpdates: z.array(z.object({
    key: discoveryKeyEnum,
    status: z.enum(["UNKNOWN", "PARTIAL", "CONFIRMED"]),
    value: z.string().nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    evidence: z.string().min(1).describe("quote or paraphrase from transcript"),
    source: z.enum(["TRANSCRIPT", "AI_INFERENCE"]).default("TRANSCRIPT"),
  })).default([]),
  insights: z.array(z.object({
    type: z.string().min(1), // missed_opportunity | discovery_gap | objection | coaching | risk
    title: z.string().min(1),
    evidence: z.string().min(1),
    confidence: z.number().min(0).max(1).nullable(),
    whyItMatters: z.string().min(1),
    recommendedAction: z.string().min(1),
  })).default([]),
  overallScore: z.number().min(0).max(100).nullable().optional(),
});
export type AnalyzeResult = z.infer<typeof analyzeSchema>;

// Follow-up drafts — §39 (human-in-the-loop, DRAFT only)
export const followUpSchema = z.object({
  drafts: z.array(z.object({
    type: z.enum(["EMAIL", "WHATSAPP", "LINKEDIN", "CRM_NOTE", "INTERNAL_SUMMARY"]),
    subject: z.string().max(160).nullable().optional(),
    content: z.string().min(1).max(8000),
  })).min(1),
});
export type FollowUpResult = z.infer<typeof followUpSchema>;

// Coaching — §41-44 (§115 direct, evidence-based)
export const coachingSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  trends: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type CoachingResult = z.infer<typeof coachingSchema>;

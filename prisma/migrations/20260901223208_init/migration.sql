-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "public"."DecisionRole" AS ENUM ('DECISION_MAKER', 'INFLUENCER', 'CHAMPION', 'USER', 'BLOCKER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."DealStage" AS ENUM ('LEAD', 'QUALIFIED', 'DISCOVERY', 'SOLUTION', 'PROPOSAL', 'NEGOTIATION', 'VERBAL_COMMITMENT', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "public"."CallStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."DiscoveryFieldStatus" AS ENUM ('UNKNOWN', 'PARTIAL', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "public"."DiscoveryFieldSource" AS ENUM ('TRANSCRIPT', 'USER', 'CRM', 'AI_INFERENCE', 'EXTERNAL_RESEARCH');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."FollowUpType" AS ENUM ('EMAIL', 'WHATSAPP', 'LINKEDIN', 'CRM_NOTE', 'INTERNAL_SUMMARY');

-- CreateEnum
CREATE TYPE "public"."FollowUpStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ObjectionCategory" AS ENUM ('PRICE', 'TIMING', 'AUTHORITY', 'TRUST', 'COMPETITION', 'STATUS_QUO', 'NEED', 'PRIORITY', 'IMPLEMENTATION', 'RISK', 'INTERNAL_APPROVAL');

-- CreateEnum
CREATE TYPE "public"."RoleplayDifficulty" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'LEVEL_6', 'LEVEL_7', 'BOSS');

-- CreateEnum
CREATE TYPE "public"."RoleplaySessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "public"."Speaker" AS ENUM ('SELLER', 'PROSPECT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."ROIScenario" AS ENUM ('CONSERVATIVE', 'BASE', 'OPTIMISTIC');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "revenueRange" TEXT,
    "location" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "decisionRole" "public"."DecisionRole" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "primaryContactId" TEXT,
    "name" TEXT NOT NULL,
    "stage" "public"."DealStage" NOT NULL DEFAULT 'LEAD',
    "value" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "source" TEXT,
    "currentSolution" TEXT,
    "desiredOutcome" TEXT,
    "painSummary" TEXT,
    "urgency" TEXT,
    "decisionProcess" TEXT,
    "decisionCriteria" TEXT,
    "nextStep" TEXT,
    "nextStepDate" TIMESTAMP(3),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscoveryField" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "public"."DiscoveryFieldStatus" NOT NULL DEFAULT 'UNKNOWN',
    "value" TEXT,
    "confidence" DOUBLE PRECISION,
    "source" "public"."DiscoveryFieldSource" NOT NULL DEFAULT 'CRM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Call" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "duration" INTEGER,
    "status" "public"."CallStatus" NOT NULL DEFAULT 'SCHEDULED',
    "analysisStatus" "public"."AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transcript" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "speakerSegments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Objection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT,
    "callId" TEXT,
    "category" "public"."ObjectionCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Objection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FollowUp" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "callId" TEXT,
    "type" "public"."FollowUpType" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" "public"."FollowUpStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ROIModel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "scenario" "public"."ROIScenario" NOT NULL DEFAULT 'BASE',
    "inputs" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "assumptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ROIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT,
    "callId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "evidence" TEXT,
    "confidence" DOUBLE PRECISION,
    "whyItMatters" TEXT,
    "recommendedAction" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIRecommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "payload" JSONB,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoachingSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "summary" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "trends" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleplayScenario" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "industry" TEXT,
    "companySize" TEXT,
    "ticket" TEXT,
    "persona" TEXT NOT NULL,
    "difficulty" "public"."RoleplayDifficulty" NOT NULL DEFAULT 'LEVEL_1',
    "publicContext" TEXT NOT NULL,
    "hiddenContext" JSONB NOT NULL,
    "painPoints" JSONB,
    "businessImpact" TEXT,
    "urgency" TEXT,
    "decisionMaker" TEXT,
    "decisionProcess" TEXT,
    "decisionCriteria" TEXT,
    "budget" TEXT,
    "currentSolution" TEXT,
    "competitors" JSONB,
    "objections" JSONB,
    "successCriteria" JSONB,
    "failureCriteria" JSONB,
    "trainingObjective" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleplayScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleplaySession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "public"."RoleplaySessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "objective" TEXT,
    "overallScore" INTEGER,
    "transcript" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleplaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleplayMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "speaker" "public"."Speaker" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "RoleplayMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleplayEvaluation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "skills" JSONB NOT NULL,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "decisiveMoments" JSONB,
    "errorTypes" JSONB,
    "recommendedExercises" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleplayEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleplayScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "skill" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'roleplay',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleplayScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrainingPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "week" INTEGER,
    "focus" TEXT,
    "exercises" JSONB,
    "goal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrainingExercise" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "scenarioId" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'TODO',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sellingStyle" TEXT,
    "targetMarket" TEXT,
    "targetTicket" TEXT,
    "preferredMethod" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "personalRisks" JSONB,
    "coachingPriorities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SellerSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "currentScore" INTEGER NOT NULL,
    "targetScore" INTEGER,
    "trend" TEXT,
    "confidence" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "agent" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCost" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "public"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Membership_organizationId_idx" ON "public"."Membership"("organizationId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "public"."Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "public"."Membership"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "Company_organizationId_idx" ON "public"."Company"("organizationId");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "public"."Company"("name");

-- CreateIndex
CREATE INDEX "Contact_organizationId_idx" ON "public"."Contact"("organizationId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "public"."Contact"("companyId");

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "public"."Contact"("email");

-- CreateIndex
CREATE INDEX "Deal_organizationId_idx" ON "public"."Deal"("organizationId");

-- CreateIndex
CREATE INDEX "Deal_companyId_idx" ON "public"."Deal"("companyId");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "public"."Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_expectedCloseDate_idx" ON "public"."Deal"("expectedCloseDate");

-- CreateIndex
CREATE INDEX "Deal_createdAt_idx" ON "public"."Deal"("createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryField_dealId_idx" ON "public"."DiscoveryField"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryField_dealId_key_key" ON "public"."DiscoveryField"("dealId", "key");

-- CreateIndex
CREATE INDEX "Call_organizationId_idx" ON "public"."Call"("organizationId");

-- CreateIndex
CREATE INDEX "Call_dealId_idx" ON "public"."Call"("dealId");

-- CreateIndex
CREATE INDEX "Call_contactId_idx" ON "public"."Call"("contactId");

-- CreateIndex
CREATE INDEX "Call_createdAt_idx" ON "public"."Call"("createdAt");

-- CreateIndex
CREATE INDEX "Call_analysisStatus_idx" ON "public"."Call"("analysisStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_callId_key" ON "public"."Transcript"("callId");

-- CreateIndex
CREATE INDEX "Transcript_callId_idx" ON "public"."Transcript"("callId");

-- CreateIndex
CREATE INDEX "Objection_organizationId_idx" ON "public"."Objection"("organizationId");

-- CreateIndex
CREATE INDEX "Objection_dealId_idx" ON "public"."Objection"("dealId");

-- CreateIndex
CREATE INDEX "FollowUp_organizationId_idx" ON "public"."FollowUp"("organizationId");

-- CreateIndex
CREATE INDEX "FollowUp_dealId_idx" ON "public"."FollowUp"("dealId");

-- CreateIndex
CREATE INDEX "Task_organizationId_idx" ON "public"."Task"("organizationId");

-- CreateIndex
CREATE INDEX "Task_dealId_idx" ON "public"."Task"("dealId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status");

-- CreateIndex
CREATE INDEX "ROIModel_organizationId_idx" ON "public"."ROIModel"("organizationId");

-- CreateIndex
CREATE INDEX "ROIModel_dealId_idx" ON "public"."ROIModel"("dealId");

-- CreateIndex
CREATE INDEX "AIInsight_organizationId_idx" ON "public"."AIInsight"("organizationId");

-- CreateIndex
CREATE INDEX "AIInsight_dealId_idx" ON "public"."AIInsight"("dealId");

-- CreateIndex
CREATE INDEX "AIInsight_type_idx" ON "public"."AIInsight"("type");

-- CreateIndex
CREATE INDEX "AIRecommendation_organizationId_idx" ON "public"."AIRecommendation"("organizationId");

-- CreateIndex
CREATE INDEX "AIRecommendation_userId_idx" ON "public"."AIRecommendation"("userId");

-- CreateIndex
CREATE INDEX "CoachingSession_organizationId_idx" ON "public"."CoachingSession"("organizationId");

-- CreateIndex
CREATE INDEX "CoachingSession_userId_idx" ON "public"."CoachingSession"("userId");

-- CreateIndex
CREATE INDEX "RoleplayScenario_organizationId_idx" ON "public"."RoleplayScenario"("organizationId");

-- CreateIndex
CREATE INDEX "RoleplayScenario_difficulty_idx" ON "public"."RoleplayScenario"("difficulty");

-- CreateIndex
CREATE INDEX "RoleplaySession_organizationId_idx" ON "public"."RoleplaySession"("organizationId");

-- CreateIndex
CREATE INDEX "RoleplaySession_userId_idx" ON "public"."RoleplaySession"("userId");

-- CreateIndex
CREATE INDEX "RoleplaySession_scenarioId_idx" ON "public"."RoleplaySession"("scenarioId");

-- CreateIndex
CREATE INDEX "RoleplaySession_status_idx" ON "public"."RoleplaySession"("status");

-- CreateIndex
CREATE INDEX "RoleplayMessage_sessionId_idx" ON "public"."RoleplayMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleplayEvaluation_sessionId_key" ON "public"."RoleplayEvaluation"("sessionId");

-- CreateIndex
CREATE INDEX "RoleplayScore_userId_idx" ON "public"."RoleplayScore"("userId");

-- CreateIndex
CREATE INDEX "RoleplayScore_skill_idx" ON "public"."RoleplayScore"("skill");

-- CreateIndex
CREATE INDEX "RoleplayScore_source_idx" ON "public"."RoleplayScore"("source");

-- CreateIndex
CREATE INDEX "TrainingPlan_organizationId_idx" ON "public"."TrainingPlan"("organizationId");

-- CreateIndex
CREATE INDEX "TrainingPlan_userId_idx" ON "public"."TrainingPlan"("userId");

-- CreateIndex
CREATE INDEX "TrainingExercise_planId_idx" ON "public"."TrainingExercise"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "public"."SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "SellerProfile_organizationId_idx" ON "public"."SellerProfile"("organizationId");

-- CreateIndex
CREATE INDEX "SellerSkill_userId_idx" ON "public"."SellerSkill"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSkill_userId_skill_key" ON "public"."SellerSkill"("userId", "skill");

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "public"."Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Activity_entityType_entityId_idx" ON "public"."Activity"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "public"."Activity"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "public"."AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIUsage_organizationId_idx" ON "public"."AIUsage"("organizationId");

-- CreateIndex
CREATE INDEX "AIUsage_provider_idx" ON "public"."AIUsage"("provider");

-- CreateIndex
CREATE INDEX "AIUsage_createdAt_idx" ON "public"."AIUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AIJob_status_idx" ON "public"."AIJob"("status");

-- CreateIndex
CREATE INDEX "AIJob_runAt_idx" ON "public"."AIJob"("runAt");

-- CreateIndex
CREATE INDEX "AIJob_type_idx" ON "public"."AIJob"("type");

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deal" ADD CONSTRAINT "Deal_primaryContactId_fkey" FOREIGN KEY ("primaryContactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscoveryField" ADD CONSTRAINT "DiscoveryField_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Call" ADD CONSTRAINT "Call_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transcript" ADD CONSTRAINT "Transcript_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Objection" ADD CONSTRAINT "Objection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Objection" ADD CONSTRAINT "Objection_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Objection" ADD CONSTRAINT "Objection_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FollowUp" ADD CONSTRAINT "FollowUp_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ROIModel" ADD CONSTRAINT "ROIModel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ROIModel" ADD CONSTRAINT "ROIModel_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIInsight" ADD CONSTRAINT "AIInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIInsight" ADD CONSTRAINT "AIInsight_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIInsight" ADD CONSTRAINT "AIInsight_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachingSession" ADD CONSTRAINT "CoachingSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleplayScenario" ADD CONSTRAINT "RoleplayScenario_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleplaySession" ADD CONSTRAINT "RoleplaySession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleplaySession" ADD CONSTRAINT "RoleplaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleplaySession" ADD CONSTRAINT "RoleplaySession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "public"."RoleplayScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleplayMessage" ADD CONSTRAINT "RoleplayMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."RoleplaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleplayEvaluation" ADD CONSTRAINT "RoleplayEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."RoleplaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrainingPlan" ADD CONSTRAINT "TrainingPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrainingExercise" ADD CONSTRAINT "TrainingExercise_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SellerSkill" ADD CONSTRAINT "SellerSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIUsage" ADD CONSTRAINT "AIUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIJob" ADD CONSTRAINT "AIJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

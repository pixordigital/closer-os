-- CreateEnum
CREATE TYPE "public"."ForecastCategory" AS ENUM ('PIPELINE', 'COMMIT', 'BEST_CASE', 'UPSIDE', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "public"."StakeholderRole" AS ENUM ('CHAMPION', 'ECONOMIC_BUYER', 'TECHNICAL_BUYER', 'USER_BUYER', 'INFLUENCER', 'BLOCKER', 'LEGAL_PROCUREMENT', 'EXECUTIVE_SPONSOR');

-- CreateEnum
CREATE TYPE "public"."StakeholderInfluence" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."StakeholderSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."MAPItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ProcurementStatus" AS ENUM ('NOT_STARTED', 'QUESTIONNAIRE_SENT', 'QUESTIONNAIRE_RECEIVED', 'SECURITY_REVIEW', 'LEGAL_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."CertificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."HealthScoreTier" AS ENUM ('HEALTHY', 'AT_RISK', 'CRITICAL', 'CHURNED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'pt-BR';

-- CreateTable
CREATE TABLE "public"."AIConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT,
    "openaiKey" TEXT,
    "anthropicKey" TEXT,
    "geminiKey" TEXT,
    "openrouterKey" TEXT,
    "litellmUrl" TEXT DEFAULT 'http://litellm:4000',
    "litellmKey" TEXT,
    "useLitellm" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ForecastSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "period" TEXT NOT NULL,
    "category" "public"."ForecastCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dealsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Stakeholder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "contactId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" "public"."StakeholderRole" NOT NULL,
    "influence" "public"."StakeholderInfluence" NOT NULL DEFAULT 'MEDIUM',
    "sentiment" "public"."StakeholderSentiment" NOT NULL DEFAULT 'UNKNOWN',
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "isDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lastEngagement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MAPItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "ownerEmail" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "public"."MAPItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MAPItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProcurementChecklist" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "questionnaireSent" BOOLEAN NOT NULL DEFAULT false,
    "questionnaireReceived" BOOLEAN NOT NULL DEFAULT false,
    "securityReview" BOOLEAN NOT NULL DEFAULT false,
    "legalReview" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."ProcurementStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CallClip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScorecardTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScorecardTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Certification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateId" TEXT,
    "status" "public"."CertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" INTEGER,
    "passedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountHealth" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "tier" "public"."HealthScoreTier" NOT NULL DEFAULT 'HEALTHY',
    "adoptionScore" INTEGER,
    "engagementScore" INTEGER,
    "supportScore" INTEGER,
    "npsScore" INTEGER,
    "lastLoginDays" INTEGER,
    "lastTouchDays" INTEGER,
    "openTickets" INTEGER,
    "churnRisk" DOUBLE PRECISION,
    "expansionPotential" DOUBLE PRECISION,
    "signals" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpansionPlaybook" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "ExpansionPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIConfig_organizationId_key" ON "public"."AIConfig"("organizationId");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_organizationId_idx" ON "public"."ForecastSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "ForecastSnapshot_period_idx" ON "public"."ForecastSnapshot"("period");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastSnapshot_organizationId_userId_period_category_key" ON "public"."ForecastSnapshot"("organizationId", "userId", "period", "category");

-- CreateIndex
CREATE INDEX "Stakeholder_organizationId_idx" ON "public"."Stakeholder"("organizationId");

-- CreateIndex
CREATE INDEX "Stakeholder_dealId_idx" ON "public"."Stakeholder"("dealId");

-- CreateIndex
CREATE INDEX "MAPItem_organizationId_idx" ON "public"."MAPItem"("organizationId");

-- CreateIndex
CREATE INDEX "MAPItem_dealId_idx" ON "public"."MAPItem"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementChecklist_dealId_key" ON "public"."ProcurementChecklist"("dealId");

-- CreateIndex
CREATE INDEX "ProcurementChecklist_organizationId_idx" ON "public"."ProcurementChecklist"("organizationId");

-- CreateIndex
CREATE INDEX "ProcurementChecklist_dealId_idx" ON "public"."ProcurementChecklist"("dealId");

-- CreateIndex
CREATE INDEX "CallClip_organizationId_idx" ON "public"."CallClip"("organizationId");

-- CreateIndex
CREATE INDEX "CallClip_callId_idx" ON "public"."CallClip"("callId");

-- CreateIndex
CREATE INDEX "CallClip_userId_idx" ON "public"."CallClip"("userId");

-- CreateIndex
CREATE INDEX "CallClip_tags_idx" ON "public"."CallClip"("tags");

-- CreateIndex
CREATE INDEX "ScorecardTemplate_organizationId_idx" ON "public"."ScorecardTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "Certification_organizationId_idx" ON "public"."Certification"("organizationId");

-- CreateIndex
CREATE INDEX "Certification_userId_idx" ON "public"."Certification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountHealth_companyId_key" ON "public"."AccountHealth"("companyId");

-- CreateIndex
CREATE INDEX "AccountHealth_organizationId_idx" ON "public"."AccountHealth"("organizationId");

-- CreateIndex
CREATE INDEX "ExpansionPlaybook_organizationId_idx" ON "public"."ExpansionPlaybook"("organizationId");

-- CreateIndex
CREATE INDEX "ExpansionPlaybook_trigger_idx" ON "public"."ExpansionPlaybook"("trigger");

-- AddForeignKey
ALTER TABLE "public"."AIConfig" ADD CONSTRAINT "AIConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stakeholder" ADD CONSTRAINT "Stakeholder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stakeholder" ADD CONSTRAINT "Stakeholder_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Stakeholder" ADD CONSTRAINT "Stakeholder_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "public"."Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MAPItem" ADD CONSTRAINT "MAPItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MAPItem" ADD CONSTRAINT "MAPItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProcurementChecklist" ADD CONSTRAINT "ProcurementChecklist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProcurementChecklist" ADD CONSTRAINT "ProcurementChecklist_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallClip" ADD CONSTRAINT "CallClip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallClip" ADD CONSTRAINT "CallClip_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScorecardTemplate" ADD CONSTRAINT "ScorecardTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certification" ADD CONSTRAINT "Certification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certification" ADD CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certification" ADD CONSTRAINT "Certification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ScorecardTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountHealth" ADD CONSTRAINT "AccountHealth_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AccountHealth" ADD CONSTRAINT "AccountHealth_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpansionPlaybook" ADD CONSTRAINT "ExpansionPlaybook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpansionPlaybook" ADD CONSTRAINT "ExpansionPlaybook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

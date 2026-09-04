-- AlterTable Company: add cnpj
ALTER TABLE "public"."Company" ADD COLUMN IF NOT EXISTS "cnpj" TEXT;
CREATE INDEX IF NOT EXISTS "Company_cnpj_idx" ON "public"."Company"("cnpj");

-- AlterTable Contact: LGPD consent
ALTER TABLE "public"."Contact" ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMP(3);
ALTER TABLE "public"."Contact" ADD COLUMN IF NOT EXISTS "consentSource" TEXT;

-- AlterTable Deal: ownerId per-closer ownership
ALTER TABLE "public"."Deal" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
CREATE INDEX IF NOT EXISTS "Deal_ownerId_idx" ON "public"."Deal"("ownerId");

-- CreateTable Product
CREATE TABLE IF NOT EXISTS "public"."Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Product_organizationId_idx" ON "public"."Product"("organizationId");
CREATE INDEX IF NOT EXISTS "Product_active_idx" ON "public"."Product"("active");
CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON "public"."Product"("sku");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Product_organizationId_fkey') THEN
    ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable Quota
CREATE TABLE IF NOT EXISTS "public"."Quota" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "target" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Quota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Quota_organizationId_userId_period_key" ON "public"."Quota"("organizationId", "userId", "period");
CREATE INDEX IF NOT EXISTS "Quota_organizationId_idx" ON "public"."Quota"("organizationId");
CREATE INDEX IF NOT EXISTS "Quota_userId_idx" ON "public"."Quota"("userId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Quota_organizationId_fkey') THEN
    ALTER TABLE "public"."Quota" ADD CONSTRAINT "Quota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable Proposal
CREATE TABLE IF NOT EXISTS "public"."Proposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "createdBy" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "html" TEXT,
    "items" JSONB,
    "total" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "expiresAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "viewedCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3),
    "acceptedIp" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Proposal_token_key" ON "public"."Proposal"("token");
CREATE INDEX IF NOT EXISTS "Proposal_organizationId_idx" ON "public"."Proposal"("organizationId");
CREATE INDEX IF NOT EXISTS "Proposal_dealId_idx" ON "public"."Proposal"("dealId");
CREATE INDEX IF NOT EXISTS "Proposal_token_idx" ON "public"."Proposal"("token");
CREATE INDEX IF NOT EXISTS "Proposal_status_idx" ON "public"."Proposal"("status");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Proposal_organizationId_fkey') THEN
    ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Proposal_dealId_fkey') THEN
    ALTER TABLE "public"."Proposal" ADD CONSTRAINT "Proposal_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "public"."WhatsappTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "WhatsappTemplate_organizationId_name_key" ON "public"."WhatsappTemplate"("organizationId", "name");
CREATE INDEX "WhatsappTemplate_organizationId_idx" ON "public"."WhatsappTemplate"("organizationId");
-- AddForeignKey
ALTER TABLE "public"."WhatsappTemplate" ADD CONSTRAINT "WhatsappTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

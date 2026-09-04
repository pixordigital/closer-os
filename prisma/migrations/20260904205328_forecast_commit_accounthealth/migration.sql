-- AlterTable
ALTER TABLE "public"."Deal" ADD COLUMN     "commitDate" TIMESTAMP(3),
ADD COLUMN     "commitNote" TEXT,
ADD COLUMN     "forecastCategory" "public"."ForecastCategory";

-- CreateIndex
CREATE INDEX "AccountHealth_companyId_idx" ON "public"."AccountHealth"("companyId");

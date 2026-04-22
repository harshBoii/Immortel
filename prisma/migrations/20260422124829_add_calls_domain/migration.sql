-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "questionPresetId" TEXT,
ADD COLUMN     "questionsToAsk" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "call_question_presets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "call_question_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_question_presets_companyId_idx" ON "call_question_presets"("companyId");

-- CreateIndex
CREATE INDEX "call_question_presets_companyId_isDefault_idx" ON "call_question_presets"("companyId", "isDefault");

-- CreateIndex
CREATE INDEX "leads_companyId_questionPresetId_idx" ON "leads"("companyId", "questionPresetId");

-- AddForeignKey
ALTER TABLE "call_question_presets" ADD CONSTRAINT "call_question_presets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_questionPresetId_fkey" FOREIGN KEY ("questionPresetId") REFERENCES "call_question_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

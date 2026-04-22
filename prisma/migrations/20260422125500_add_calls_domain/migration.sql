-- CreateTable
CREATE TABLE "call_configs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "languageMode" VARCHAR(32) NOT NULL DEFAULT 'english',
    "voiceMode" VARCHAR(32) NOT NULL DEFAULT 'speed',
    "voiceId" VARCHAR(255),
    "llmProvider" VARCHAR(32) NOT NULL DEFAULT 'groq',
    "agentName" VARCHAR(120),
    "agentTone" VARCHAR(500),
    "systemPrompt" TEXT,
    "openingGreeting" VARCHAR(500),
    "useSarvamTts" BOOLEAN NOT NULL DEFAULT false,
    "sarvamSpeaker" VARCHAR(32),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "call_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_configs_companyId_key" ON "call_configs"("companyId");

-- CreateIndex
CREATE INDEX "call_configs_companyId_idx" ON "call_configs"("companyId");

-- AddForeignKey
ALTER TABLE "call_configs" ADD CONSTRAINT "call_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

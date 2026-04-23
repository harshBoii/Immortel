-- CreateTable
CREATE TABLE "call_feedback_tokens" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(128) NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "callId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_feedback_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_feedback" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "callId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reason" VARCHAR(80),
    "text" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "call_feedback_tokens_token_key" ON "call_feedback_tokens"("token");

-- CreateIndex
CREATE INDEX "call_feedback_tokens_companyId_idx" ON "call_feedback_tokens"("companyId");

-- CreateIndex
CREATE INDEX "call_feedback_tokens_companyId_callId_idx" ON "call_feedback_tokens"("companyId", "callId");

-- CreateIndex
CREATE INDEX "call_feedback_tokens_leadId_idx" ON "call_feedback_tokens"("leadId");

-- CreateIndex
CREATE INDEX "call_feedback_tokens_expiresAt_idx" ON "call_feedback_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "call_feedback_companyId_idx" ON "call_feedback"("companyId");

-- CreateIndex
CREATE INDEX "call_feedback_companyId_leadId_idx" ON "call_feedback"("companyId", "leadId");

-- CreateIndex
CREATE INDEX "call_feedback_companyId_callId_idx" ON "call_feedback"("companyId", "callId");

-- AddForeignKey
ALTER TABLE "call_feedback_tokens" ADD CONSTRAINT "call_feedback_tokens_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_feedback_tokens" ADD CONSTRAINT "call_feedback_tokens_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_feedback_tokens" ADD CONSTRAINT "call_feedback_tokens_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_feedback" ADD CONSTRAINT "call_feedback_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_feedback" ADD CONSTRAINT "call_feedback_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_feedback" ADD CONSTRAINT "call_feedback_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

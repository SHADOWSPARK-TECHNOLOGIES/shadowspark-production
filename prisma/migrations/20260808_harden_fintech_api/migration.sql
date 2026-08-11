-- Harden fintech API: message lifecycle, KYC history/OCR, workflows, API keys, invitations, settings changes.

-- Loan assignment tracking.
ALTER TABLE "loan_applications" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT;

-- Message lifecycle columns (status default moved to QUEUED in application code to avoid destructive DEFAULT change).
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "error" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "messages_status_idx" ON "messages"("status");

-- KYC OCR job queue.
CREATE TABLE IF NOT EXISTS "kyc_ocr_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kycDocumentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "kyc_ocr_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "kyc_ocr_jobs_tenantId_kycDocumentId_idx" ON "kyc_ocr_jobs"("tenantId", "kycDocumentId");
CREATE INDEX IF NOT EXISTS "kyc_ocr_jobs_status_idx" ON "kyc_ocr_jobs"("status");

-- KYC verification history (immutable audit of every decision).
CREATE TABLE IF NOT EXISTS "kyc_verification_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kycDocumentId" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actorId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kyc_verification_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "kyc_verification_history_tenantId_kycDocumentId_idx" ON "kyc_verification_history"("tenantId", "kycDocumentId");
CREATE INDEX IF NOT EXISTS "kyc_verification_history_tenantId_loanApplicationId_idx" ON "kyc_verification_history"("tenantId", "loanApplicationId");

-- Minimal workflow definition + execution records.
CREATE TABLE IF NOT EXISTS "workflows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "workflows_tenantId_idx" ON "workflows"("tenantId");
CREATE INDEX IF NOT EXISTS "workflows_tenantId_isActive_idx" ON "workflows"("tenantId", "isActive");

CREATE TABLE IF NOT EXISTS "workflow_executions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "workflow_executions_tenantId_workflowId_idx" ON "workflow_executions"("tenantId", "workflowId");
CREATE INDEX IF NOT EXISTS "workflow_executions_status_idx" ON "workflow_executions"("status");
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- API key storage (server-side only; plaintext never persisted).
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_keyHash_key" UNIQUE ("keyHash")
);
CREATE INDEX IF NOT EXISTS "api_keys_tenantId_idx" ON "api_keys"("tenantId");
CREATE INDEX IF NOT EXISTS "api_keys_tenantId_revokedAt_idx" ON "api_keys"("tenantId", "revokedAt");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tenant invitations.
CREATE TABLE IF NOT EXISTS "invitations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invitations_tokenHash_key" UNIQUE ("tokenHash"),
    CONSTRAINT "invitations_tenantId_email_key" UNIQUE ("tenantId", "email")
);
CREATE INDEX IF NOT EXISTS "invitations_tenantId_email_idx" ON "invitations"("tenantId", "email");
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Settings change audit log.
CREATE TABLE IF NOT EXISTS "settings_changes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "settings_changes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "settings_changes_tenantId_category_idx" ON "settings_changes"("tenantId", "category");
ALTER TABLE "settings_changes" ADD CONSTRAINT "settings_changes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys for new tenant relations.
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_ocr_jobs" ADD CONSTRAINT "kyc_ocr_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "kyc_verification_history" ADD CONSTRAINT "kyc_verification_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

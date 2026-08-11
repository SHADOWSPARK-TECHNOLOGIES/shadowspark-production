-- CreateTable
CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "companyName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- Seed default tenant for existing users
INSERT INTO "tenants" ("id", "name", "companyName", "updatedAt")
VALUES ('public', 'Public Tenant', 'Public Tenant', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT;

-- AddForeignKey
ALTER TABLE "User"
  ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateTable
CREATE TABLE "loan_applications" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "applicantPhone" TEXT NOT NULL,
  "applicantEmail" TEXT,
  "bvn" TEXT,
  "bvnLast4" TEXT,
  "loanPurpose" TEXT,
  "loanAmount" DECIMAL(19,4) NOT NULL,
  "interestRate" DECIMAL(8,4),
  "tenureMonths" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "assignedOfficerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "documentUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "content" TEXT NOT NULL,
  "senderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "loanApplicationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loan_applications_tenantId_status_createdAt_idx" ON "loan_applications"("tenantId", "status", "createdAt");
CREATE INDEX "loan_applications_tenantId_assignedOfficerId_idx" ON "loan_applications"("tenantId", "assignedOfficerId");
CREATE UNIQUE INDEX "loan_applications_id_tenantId_key" ON "loan_applications"("id", "tenantId");

CREATE INDEX "kyc_documents_tenantId_status_createdAt_idx" ON "kyc_documents"("tenantId", "status", "createdAt");
CREATE INDEX "kyc_documents_loanApplicationId_status_idx" ON "kyc_documents"("loanApplicationId", "status");
CREATE UNIQUE INDEX "kyc_documents_id_tenantId_key" ON "kyc_documents"("id", "tenantId");

CREATE INDEX "repayments_tenantId_status_dueDate_idx" ON "repayments"("tenantId", "status", "dueDate");
CREATE INDEX "repayments_loanApplicationId_dueDate_idx" ON "repayments"("loanApplicationId", "dueDate");
CREATE UNIQUE INDEX "repayments_id_tenantId_key" ON "repayments"("id", "tenantId");

CREATE INDEX "messages_tenantId_channel_status_createdAt_idx" ON "messages"("tenantId", "channel", "status", "createdAt");
CREATE INDEX "messages_loanApplicationId_createdAt_idx" ON "messages"("loanApplicationId", "createdAt");
CREATE UNIQUE INDEX "messages_id_tenantId_key" ON "messages"("id", "tenantId");

CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_loanApplicationId_createdAt_idx" ON "audit_logs"("loanApplicationId", "createdAt");
CREATE UNIQUE INDEX "audit_logs_id_tenantId_key" ON "audit_logs"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "loan_applications"
  ADD CONSTRAINT "loan_applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loan_applications"
  ADD CONSTRAINT "loan_applications_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "kyc_documents"
  ADD CONSTRAINT "kyc_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "kyc_documents"
  ADD CONSTRAINT "kyc_documents_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "repayments"
  ADD CONSTRAINT "repayments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repayments"
  ADD CONSTRAINT "repayments_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "loan_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

import { prisma } from "@/lib/prisma";
import { verifyBVN } from "@/lib/kyc/bvn";
import { createLoanApplicationSchema, creditBureauPullSchema, disbursementSchema, reminderSequenceSchema, verifyKycSchema, type CreateLoanApplicationInput } from "@/lib/fintech/types";

export async function createLoanApplication(input: CreateLoanApplicationInput) {
  const parsed = createLoanApplicationSchema.parse(input);
  const tenant = await prisma.tenant.upsert({
    where: { slug: parsed.tenantId },
    update: {},
    create: { slug: parsed.tenantId, name: parsed.tenantId },
  });

  const customer = await prisma.customer.upsert({
    where: { tenantId_phoneNumber: { tenantId: tenant.id, phoneNumber: parsed.customer.phoneNumber } },
    update: {
      fullName: parsed.customer.fullName,
      email: parsed.customer.email,
      bvnNumber: parsed.customer.bvnNumber,
      ninNumber: parsed.customer.ninNumber,
    },
    create: {
      tenantId: tenant.id,
      fullName: parsed.customer.fullName,
      phoneNumber: parsed.customer.phoneNumber,
      email: parsed.customer.email,
      bvnNumber: parsed.customer.bvnNumber,
      ninNumber: parsed.customer.ninNumber,
    },
  });

  const application = await prisma.loanApplication.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      externalRef: parsed.application.externalRef,
      applicantName: parsed.customer.fullName,
      phoneNumber: parsed.customer.phoneNumber,
      email: parsed.customer.email,
      loanAmountKobo: parsed.application.loanAmountKobo,
      purpose: parsed.application.purpose,
      notes: parsed.application.notes,
      botSessionId: parsed.application.botSessionId,
      documents: {
        create: parsed.documents.map((doc) => ({ ...doc, tenantId: tenant.id })),
      },
      auditLogs: {
        create: {
          tenantId: tenant.id,
          actorType: "SYSTEM",
          entityType: "LoanApplication",
          entityId: "pending",
          action: "LOAN_APPLICATION_CREATED",
          payload: parsed,
        },
      },
    },
    include: { documents: true, customer: true },
  });

  await prisma.auditLog.updateMany({ where: { entityId: "pending", loanApplicationId: application.id }, data: { entityId: application.id } });
  return application;
}

export async function verifyLoanKyc(input: unknown) {
  const parsed = verifyKycSchema.parse(input);
  const application = await prisma.loanApplication.findFirst({ where: { id: parsed.loanApplicationId, tenant: { slug: parsed.tenantId } }, include: { customer: true } });
  if (!application) throw new Error("APPLICATION_NOT_FOUND");

  const result = await verifyBVN(parsed.bvnNumber);
  const kycRecord = await prisma.kycRecord.upsert({
    where: { applicationId: application.id },
    update: {
      tenantId: application.tenantId,
      customerId: application.customerId,
      bvnNumber: parsed.bvnNumber,
      status: result.verified ? "VERIFIED" : "FAILED",
      verifiedName: result.name,
      dateOfBirth: result.dateOfBirth,
      providerRef: result.providerRef,
      providerPayload: result.raw,
      verifiedAt: result.verified ? new Date() : null,
    },
    create: {
      tenantId: application.tenantId,
      customerId: application.customerId,
      applicationId: application.id,
      bvnNumber: parsed.bvnNumber,
      status: result.verified ? "VERIFIED" : "FAILED",
      verifiedName: result.name,
      dateOfBirth: result.dateOfBirth,
      providerRef: result.providerRef,
      providerPayload: result.raw,
      verifiedAt: result.verified ? new Date() : null,
    },
  });

  await prisma.loanApplication.update({ where: { id: application.id }, data: { status: result.verified ? "UNDER_REVIEW" : "KYC_REQUIRED" } });
  await prisma.auditLog.create({ data: { tenantId: application.tenantId, loanApplicationId: application.id, actorType: "SYSTEM", entityType: "KycRecord", entityId: kycRecord.id, action: result.verified ? "KYC_VERIFIED" : "KYC_FAILED", payload: result.raw } });
  return { applicationId: application.id, kycRecord, verified: result.verified, error: result.error };
}

export async function createCreditBureauPull(input: unknown) {
  const parsed = creditBureauPullSchema.parse(input);
  return prisma.creditBureauPull.create({
    data: {
      tenantId: parsed.tenantId,
      loanApplicationId: parsed.loanApplicationId,
      customerId: parsed.customerId,
      bureau: parsed.bureau,
      status: "PENDING",
    },
  });
}

export async function createDisbursementEvent(input: unknown) {
  const parsed = disbursementSchema.parse(input);
  const application = await prisma.loanApplication.findFirst({ where: { id: parsed.loanApplicationId, tenant: { slug: parsed.tenantId } } });
  if (!application) throw new Error("APPLICATION_NOT_FOUND");

  const event = await prisma.disbursementEvent.create({
    data: {
      tenantId: application.tenantId,
      loanApplicationId: application.id,
      amountKobo: parsed.amountKobo,
      reference: parsed.reference,
      provider: parsed.provider,
      payload: parsed.payload,
      status: "PENDING",
    },
  });

  await prisma.auditLog.create({ data: { tenantId: application.tenantId, loanApplicationId: application.id, actorType: "SYSTEM", entityType: "DisbursementEvent", entityId: event.id, action: "DISBURSEMENT_CREATED", payload: parsed } });
  return event;
}

export async function createReminderSequence(input: unknown) {
  const parsed = reminderSequenceSchema.parse(input);
  return prisma.reminderSequence.create({
    data: {
      tenantId: parsed.tenantId,
      repaymentPlanId: parsed.repaymentPlanId,
      escalationLevel: parsed.escalationLevel,
      rules: parsed.rules,
    },
  });
}

export async function getDashboardMetrics(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  const [applications, kycVerified, disbursements, delinquent] = await Promise.all([
    prisma.loanApplication.count({ where: { tenantId: tenant.id } }),
    prisma.kycRecord.count({ where: { tenantId: tenant.id, status: "VERIFIED" } }),
    prisma.disbursementEvent.count({ where: { tenantId: tenant.id, status: { in: ["PENDING", "DELIVERED", "SENT"] } } }),
    prisma.repaymentEvent.count({ where: { tenantId: tenant.id, status: "PENDING", dueAt: { lt: new Date() } } }),
  ]);

  return { applications, kycVerified, disbursements, delinquent };
}

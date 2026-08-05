import { z } from "zod";

export const tenantIdSchema = z.string().min(1);

export const structuredErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const createLoanApplicationSchema = z.object({
  tenantId: tenantIdSchema,
  customer: z.object({
    fullName: z.string().min(2),
    phoneNumber: z.string().min(7),
    email: z.string().email().optional(),
    bvnNumber: z.string().regex(/^\d{11}$/).optional(),
    ninNumber: z.string().min(8).optional(),
  }),
  application: z.object({
    externalRef: z.string().min(1).optional(),
    loanAmountKobo: z.coerce.bigint(),
    purpose: z.string().min(3),
    notes: z.string().optional(),
    botSessionId: z.string().optional(),
  }),
  documents: z.array(z.object({
    docType: z.string().min(2),
    fileUrl: z.string().url(),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
    storageKey: z.string().optional(),
    checksum: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
});

export const verifyKycSchema = z.object({
  tenantId: tenantIdSchema,
  loanApplicationId: z.string().min(1),
  bvnNumber: z.string().regex(/^\d{11}$/),
});

export const creditBureauPullSchema = z.object({
  tenantId: tenantIdSchema,
  loanApplicationId: z.string().min(1),
  customerId: z.string().min(1),
  bureau: z.enum(["CRC", "FIRSTCENTRAL"]),
});

export const disbursementSchema = z.object({
  tenantId: tenantIdSchema,
  loanApplicationId: z.string().min(1),
  amountKobo: z.coerce.bigint(),
  reference: z.string().min(1),
  provider: z.string().default("WHATSAPP"),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const reminderSequenceSchema = z.object({
  tenantId: tenantIdSchema,
  repaymentPlanId: z.string().min(1),
  escalationLevel: z.number().int().min(0).default(0),
  rules: z.object({
    cadenceHours: z.number().int().min(1),
    maxAttempts: z.number().int().min(1),
    channels: z.array(z.string().min(2)).min(1),
  }),
});

export type CreateLoanApplicationInput = z.infer<typeof createLoanApplicationSchema>;
export type VerifyKycInput = z.infer<typeof verifyKycSchema>;
export type CreditBureauPullInput = z.infer<typeof creditBureauPullSchema>;
export type DisbursementInput = z.infer<typeof disbursementSchema>;
export type ReminderSequenceInput = z.infer<typeof reminderSequenceSchema>;

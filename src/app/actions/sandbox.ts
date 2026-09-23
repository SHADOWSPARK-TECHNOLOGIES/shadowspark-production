"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { createComplianceBrief } from "@/lib/ai-assist/client";

export interface TargetInstitutionPreset {
  slug: string;
  name: string;
  sector: string;
  description: string;
}

const BATCH_01_INSTITUTIONS_RECORD: Record<string, TargetInstitutionPreset> = {
  fairmoney: {
    slug: "fairmoney",
    name: "FairMoney Microfinance Bank",
    sector: "Digital MFB / Lending",
    description: "Credit-led digital banking platform with over 10,000 daily loan applications.",
  },
  carbon: {
    slug: "carbon",
    name: "Carbon Finance (OneFi)",
    sector: "Digital Lending & Payments",
    description: "Pioneer consumer credit, payments, and investment platform in Nigeria.",
  },
  renmoney: {
    slug: "renmoney",
    name: "Renmoney Microfinance Bank",
    sector: "Consumer & MSME Lending",
    description: "Leading fintech MFB providing personal and business loans.",
  },
  branch: {
    slug: "branch",
    name: "Branch International Nigeria",
    sector: "Personal Lending & Neo-bank",
    description: "Machine-learning driven personal finance and instant microloans.",
  },
  kuda: {
    slug: "kuda",
    name: "Kuda Microfinance Bank",
    sector: "Digital Banking",
    description: "Zero-fee digital bank with over 7 million retail accounts.",
  },
  palmpay: {
    slug: "palmpay",
    name: "PalmPay Nigeria",
    sector: "Mobile Payments & Consumer Credit",
    description: "Fast-growing payments network and consumer credit ecosystem.",
  },
  quidax: {
    slug: "quidax",
    name: "Quidax Technologies",
    sector: "Digital Assets / SEC ARIP",
    description: "SEC ARIP-approved digital asset exchange and fiat on/off-ramp.",
  },
  busha: {
    slug: "busha",
    name: "Busha Digital",
    sector: "Crypto & Exchange / SEC ARIP",
    description: "SEC-regulated cryptocurrency exchange and digital wallet provider.",
  },
  yellowcard: {
    slug: "yellowcard",
    name: "Yellow Card Financial",
    sector: "Pan-African On/Off Ramp",
    description: "Licensed pan-African stablecoin and cross-border settlement infrastructure.",
  },
  flitaa: {
    slug: "flitaa",
    name: "Flitaa Marketplace",
    sector: "Crypto & Payment Infrastructure",
    description: "Simplified cryptocurrency trading platform and payments gateway.",
  },
};

export async function getTargetInstitutions(): Promise<TargetInstitutionPreset[]> {
  return Object.values(BATCH_01_INSTITUTIONS_RECORD);
}

export interface ProvisionTrialTenantInput {
  institutionSlug?: string;
  companyName?: string;
  operatorEmail?: string;
  operatorName?: string;
  operatorPassword?: string;
  autoSignIn?: boolean;
}

export interface ProvisionTrialTenantOutput {
  success: boolean;
  tenant: {
    id: string;
    name: string;
    companyName: string;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
  };
  membership: {
    id: string;
    tenantId: string;
    userId: string;
    role: string;
  };
  credentials: {
    email: string;
    password: string;
  };
  loans: Array<{
    id: string;
    tenantId: string;
    applicantName: string;
    applicantPhone: string;
    loanAmount: Prisma.Decimal;
    loanPurpose: string | null;
    status: string;
  }>;
  auditLog: {
    id: string;
    tenantId: string;
    action: string;
    actorId: string | null;
    metadata: unknown;
  };
  briefs: Array<{
    exceptionId: string;
    success: boolean;
    briefId?: string;
    error?: string;
  }>;
  redirectUrl: string;
}

class SandboxProvisioningError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string = "An account with this email already exists. Please sign in or use a different email address.",
    status = 409,
    code = "EMAIL_ALREADY_EXISTS"
  ) {
    super(message);
    this.name = "SandboxProvisioningError";
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, SandboxProvisioningError.prototype);
  }
}

export async function provisionTrialTenantCore(
  input: ProvisionTrialTenantInput = {}
): Promise<ProvisionTrialTenantOutput> {
  const rawSlug = input.institutionSlug || "fairmoney";
  const slug = rawSlug.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "demo";
  const preset = BATCH_01_INSTITUTIONS_RECORD[slug];
  const companyName = input.companyName?.trim() || preset?.name || `${slug.toUpperCase()} Finance Demo`;

  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const tenantName = `trial-${slug}-${randomSuffix}`;
  const operatorPassword = input.operatorPassword?.trim() || "SandboxDemo2026!";
  const operatorEmail =
    input.operatorEmail?.trim() || `compliance.${slug}.${randomSuffix}@demo.shadowspark.ng`;
  const operatorName = input.operatorName?.trim() || `Compliance Officer (${companyName})`;

  // Hash password outside $transaction per prisma-patterns to avoid holding DB connections
  const hashedPassword = await bcrypt.hash(operatorPassword, 10);

  // 1. Neon DB Transaction: Tenant, User, TenantMembership, 3 Synthetic Loan Exceptions, AuditLog
  const txResult = await prisma.$transaction(async (tx) => {
    // 1a. Check for existing user by email to prevent unauthenticated account linkage
    const existingUser = await tx.user.findUnique({
      where: { email: operatorEmail },
    });

    if (existingUser) {
      throw new SandboxProvisioningError(
        "An account with this email already exists. Please sign in or use a different email address.",
        409,
        "EMAIL_ALREADY_EXISTS"
      );
    }

    // 1b. Isolated Tenant
    const tenant = await tx.tenant.create({
      data: {
        name: tenantName,
        companyName,
      },
    });

    // 1c. Create User with role COMPLIANCE
    const user = await tx.user.create({
      data: {
        email: operatorEmail,
        name: operatorName,
        password: hashedPassword,
        role: "COMPLIANCE",
      },
    });

    // 1c. TenantMembership with role COMPLIANCE
    const membership = await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "COMPLIANCE",
      },
    });

    // 1d. Seed 3 synthetic LoanApplication exceptions with exact Prisma.Decimal monetary amounts
    // Exception 1: BVN mismatch flag
    const loan1 = await tx.loanApplication.create({
      data: {
        tenantId: tenant.id,
        applicantName: "Adaeze Okonkwo",
        applicantPhone: "+2348011223344",
        loanAmount: new Prisma.Decimal("350000.00"),
        loanPurpose: "Working Capital — MSME Retail",
        status: "UNDER_REVIEW",
      },
    });

    // Exception 2: Structuring velocity flag
    const loan2 = await tx.loanApplication.create({
      data: {
        tenantId: tenant.id,
        applicantName: "Emeka Nwosu",
        applicantPhone: "+2348022334455",
        loanAmount: new Prisma.Decimal("1250000.00"),
        loanPurpose: "Inventory Financing",
        status: "KYC_PENDING",
      },
    });

    // Exception 3: PEP screening flag
    const loan3 = await tx.loanApplication.create({
      data: {
        tenantId: tenant.id,
        applicantName: "Babajide Alabi",
        applicantPhone: "+2348033445566",
        loanAmount: new Prisma.Decimal("850000.00"),
        loanPurpose: "Equipment Acquisition",
        status: "UNDER_REVIEW",
      },
    });

    const loans = [loan1, loan2, loan3];

    // 1e. Emit initial provisioning AuditLog
    const auditLog = await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: user.id,
        action: "TRIAL_TENANT_PROVISIONED",
        metadata: {
          institutionSlug: slug,
          companyName,
          syntheticLoanCount: loans.length,
          syntheticLoans: loans.map((l) => ({
            id: l.id,
            applicant: l.applicantName,
            amount: l.loanAmount.toString(),
            status: l.status,
          })),
          provisionedAt: new Date().toISOString(),
        },
      },
    });

    return { tenant, user, membership, loans, auditLog };
  });

  // 2. Upstream AI-ASSIST Brief Seeding outside the DB transaction
  const briefResults: Array<{
    exceptionId: string;
    success: boolean;
    briefId?: string;
    error?: string;
  }> = [];

  for (const loan of txResult.loans) {
    try {
      const brief = await createComplianceBrief({
        exceptionId: `ex_${slug}_${loan.id}`,
        tenantId: txResult.tenant.id,
        requestId: `seed_${loan.id}`,
        idempotencyKey: `seed_${txResult.tenant.id}_${loan.id}`,
      });
      briefResults.push({
        exceptionId: loan.id,
        success: true,
        briefId: brief.brief_id,
      });
    } catch (err: unknown) {
      briefResults.push({
        exceptionId: loan.id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    success: true,
    tenant: {
      id: txResult.tenant.id,
      name: txResult.tenant.name,
      companyName: txResult.tenant.companyName,
    },
    user: {
      id: txResult.user.id,
      email: txResult.user.email,
      name: txResult.user.name,
      role: txResult.user.role,
    },
    membership: {
      id: txResult.membership.id,
      tenantId: txResult.membership.tenantId,
      userId: txResult.membership.userId,
      role: txResult.membership.role,
    },
    credentials: {
      email: operatorEmail,
      password: operatorPassword,
    },
    loans: txResult.loans,
    auditLog: {
      id: txResult.auditLog.id,
      tenantId: txResult.auditLog.tenantId,
      action: txResult.auditLog.action,
      actorId: txResult.auditLog.actorId,
      metadata: txResult.auditLog.metadata,
    },
    briefs: briefResults,
    redirectUrl: "/dashboard/reviews",
  };
}

export async function provisionTrialTenant(
  input: ProvisionTrialTenantInput = {}
): Promise<ProvisionTrialTenantOutput> {
  const result = await provisionTrialTenantCore(input);

  // If autoSignIn is not explicitly disabled, attempt server-side sign-in
  if (input.autoSignIn !== false) {
    try {
      await signIn("credentials", {
        email: result.credentials.email,
        password: result.credentials.password,
        redirect: false,
      });
    } catch (authErr) {
      // In test/non-cookie environments signIn may throw or redirect; safe to ignore
    }
  }

  return result;
}

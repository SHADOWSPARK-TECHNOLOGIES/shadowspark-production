import { prisma } from './prisma';
import type { Lead } from '@/generated/prisma/client/client';
import { scheduleDemoForLead } from './demo-service';
import { enqueueFollowUp } from './leads/queue';
import { detectVaspInstitutionalLead } from './scoring/engine';
import { LedgerService } from './ledger/index';

export interface CreateLeadInput {
  email?: string;
  phoneNumber?: string;
  intent?: string;
  metadata?: Record<string, any>;
}

export async function createLead(input: CreateLeadInput) {
  const { email, phoneNumber, intent, metadata } = input;
  
  if (!email && !phoneNumber) {
    throw new Error('Either email or phone number is required');
  }

  try {
    const isQualified = intent && intent.length > 10;
    const initialStatus = isQualified ? 'QUALIFIED' : 'NEW';

    const lead = await prisma.lead.upsert({
      where: email ? { email } : { phoneNumber: phoneNumber! },
      update: { 
        phoneNumber: phoneNumber ?? undefined,
        email: email ?? undefined,
        intent: intent ?? undefined,
        status: initialStatus,
        metadata: metadata ? (metadata as any) : undefined,
        updatedAt: new Date(),
      },
      create: {
        email: email ?? null,
        phoneNumber: phoneNumber ?? null,
        intent: intent ?? 'inquiry',
        status: initialStatus,
        metadata: metadata ? (metadata as any) : {},
      },
    });

    // System Event Logging
    await prisma.systemEvent.create({
      data: {
        type: "TOOL_EXECUTION",
        message: "Lead created/updated via tool execution",
        metadata: {
          tool: "createLead",
          leadId: lead.id,
          source: metadata?.source || "chatbot",
          status: initialStatus
        }
      }
    });

    // ── SEC 26-1 VASP Institutional Lead Detection ──────────────────────
    if (intent) {
      const detection = detectVaspInstitutionalLead(intent, metadata);
      if (detection.isVaspInstitutional) {
        try {
          const escrowAccount = await LedgerService.provisionVaspEscrowAccount(
            lead.id,
            lead.email ?? lead.phoneNumber ?? 'Unknown Lead',
            detection.estimatedLiquidity ?? BigInt(0)
          );
          // Store escrow account reference in lead metadata
          const updatedMetadata = {
            ...((lead.metadata as Record<string, unknown>) ?? {}),
            escrowAccountId: escrowAccount.id,
            escrowProvisionedAt: new Date().toISOString(),
            vaspDetectionReason: detection.reason,
          };
          await prisma.lead.update({
            where: { id: lead.id },
            data: { metadata: updatedMetadata as any },
          });
          console.log(
            `[SEC 26-1] Escrow account ${escrowAccount.id} provisioned for lead ${lead.id}`
          );
        } catch (escrowErr) {
          console.error(
            `[SEC 26-1] Failed to provision escrow for lead ${lead.id}:`,
            escrowErr
          );
        }
      }
    }

    // Enqueue 24h follow-up
    await enqueueFollowUp(lead.id).catch(err => console.error("Failed to enqueue follow-up:", err));

    return { success: true, lead };
  } catch (error) {
    console.error('Lead creation error:', error);
    throw new Error('Failed to process lead');
  }
}

export async function getLeads(statusFilter?: string) {
  try {
    const where = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
    return await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw new Error('Failed to fetch leads');
  }
}

export async function updateLeadStatus(id: string, status: string) {
  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { 
        status,
        demoScheduled: status === 'demo_scheduled' ? true : undefined
      },
    });

    if (status === 'demo_scheduled') {
      await scheduleDemoForLead(id, lead.email);
    }

    return { success: true, lead };
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw new Error('Failed to update lead status');
  }
}


import { prisma } from '@/lib/prisma';
import { sendOutreach } from '@/lib/email/send-outreach';

export async function recoverAbandonedCheckout(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, error: 'Lead not found' };
    if (!lead.email) return { success: false, error: 'Lead has no email' };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutUrl = `${baseUrl}/checkout?leadId=${leadId}&plan=audit`;

    const name = (lead.metadata && (lead.metadata as any).name) || lead.email.split('@')[0] || 'there';

    const subject = 'Reminder: Complete your ShadowSpark System Audit';
    const body = `Hi ${name},<br/><br/>We noticed you started the checkout for a ShadowSpark System Audit but didn't finish. The $10 deposit is refundable after the audit. Secure your slot and we'll prioritize your assessment:<br/><br/><a href="${checkoutUrl}">Secure My Audit</a><br/><br/>Thanks,<br/>The ShadowSpark Team`;

    const result = await sendOutreach({ leadId, subject, body });

    await prisma.systemEvent.create({
      data: {
        type: 'RECOVER_EMAIL_SENT',
        message: `Recovery outreach sent to ${lead.email}`,
        metadata: { leadId, email: lead.email, result },
      },
    });

    return { success: true, result };
  } catch (error) {
    console.error('[RECOVER] failed', error);
    try {
      await prisma.systemEvent.create({
        data: {
          type: 'RECOVER_ERROR',
          message: `Failed to send recovery outreach for ${leadId}`,
          metadata: { leadId, error: (error as Error).message },
        },
      });
    } catch (e) {
      console.error('[RECOVER] failed to log error', e);
    }
    return { success: false, error: (error as Error).message };
  }
}

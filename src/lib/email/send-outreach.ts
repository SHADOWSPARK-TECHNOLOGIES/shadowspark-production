import { Resend } from 'resend';
import { headers } from 'next/headers';

import { prependGreeting } from '@/lib/i18n/greetings';
import { prisma } from '@/lib/prisma';

const hasResendKey = Boolean(process.env.RESEND_API_KEY);
const resend = hasResendKey ? new Resend(process.env.RESEND_API_KEY) : null;

interface SendOutreachParams {
  leadId: string;
  subject: string;
  body: string;
  acceptLanguage?: string | null;
}

async function getRequestAcceptLanguage(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    return requestHeaders.get('accept-language');
  } catch {
    return null;
  }
}

export async function sendOutreach({
  leadId,
  subject,
  body,
  acceptLanguage,
}: SendOutreachParams) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) throw new Error('Lead not found or missing email');

    const resolvedAcceptLanguage = acceptLanguage ?? (await getRequestAcceptLanguage());
    const localizedBody = prependGreeting(body, resolvedAcceptLanguage);

    if (!resend) {
      // No Resend API key configured in environment — simulate sending for local tests
      await prisma.emailEvent.create({
        data: {
          leadId,
          type: 'sent',
          metadata: { simulated: true, acceptLanguage: resolvedAcceptLanguage },
        },
      });

      return { success: true, simulated: true };
    }

    const { data, error } = await resend.emails.send({
      from: 'ShadowSpark <architect@shadowspark-tech.org>',
      to: [lead.email],
      subject,
      html: localizedBody,
      headers: {
        'X-Lead-Id': leadId,
      },
      tags: [{ name: 'category', value: 'outreach' }],
    });

    if (error) throw error;

    await prisma.emailEvent.create({
      data: {
        leadId,
        type: 'sent',
        metadata: { messageId: data?.id, acceptLanguage: resolvedAcceptLanguage },
      },
    });

    return { success: true, messageId: data?.id };
  } catch (error) {
    throw error;
  }
}

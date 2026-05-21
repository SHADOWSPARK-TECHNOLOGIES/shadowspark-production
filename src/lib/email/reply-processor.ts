import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '@/lib/prisma';
import { sendOutreach } from './send-outreach';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processInboundReply(leadId: string, replyText: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const history = await prisma.emailEvent.findMany({
    where: { leadId, type: { in: ['sent', 'replied'] } },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  const { text: aiResponse } = await generateText({
    model: google('gemini-2.0-flash-exp'),
    system: `You are an AI assistant for ShadowSpark. You are following up on an outreach email. Keep responses helpful, concise, and human. Do not push for a demo unless the lead shows clear interest.`,
    prompt: `
Lead Data: ${JSON.stringify(lead.metadata)}
Previous conversation:
${history.map(e => `${e.type}: ${(e.metadata as any)?.text || ''}`).join('\n')}

Inbound reply:
"${replyText}"

Write a brief, friendly reply addressing their message. Offer the $10 system audit link if they seem interested.`,
  });

  await sendOutreach({
    leadId,
    subject: `Re: Infrastructure Follow-up`, 
    body: aiResponse,
  });
}

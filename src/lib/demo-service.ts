import { prisma } from './prisma';

export async function scheduleDemoForLead(leadId: string, email: string | null) {
  try {
    // 1. Create a unique slug for the Demo placeholder
    const slug = `demo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    
    // 2. Upsert a Demo record (calendar placeholder)
    const demo = await prisma.demo.upsert({
      where: { leadId },
      update: {},
      create: {
        slug,
        leadId,
        config: { 
          type: 'calendar_placeholder', 
          scheduledAt: new Date(Date.now() + 86400000).toISOString() // Tomorrow
        },
        approved: false, // Requires payment/final approval
      }
    });

    // 3. Update Lead status to demo scheduled
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "demo_scheduled",
        demoScheduled: true
      }
    });

    // 4. Log a SystemEvent acting as the "Email Notification sent" trigger
    await prisma.systemEvent.create({
      data: {
        type: 'DEMO_SCHEDULED_EMAIL_SENT',
        message: `Automated demo scheduling payload dispatched to ${email || 'unknown'}`,
        metadata: { leadId, demoId: demo.id, slug }
      }
    });

    // 5. Log the Tool Execution
    await prisma.systemEvent.create({
      data: {
        type: "TOOL_EXECUTION",
        message: "Demo scheduled via tool execution",
        metadata: {
          tool: "scheduleDemo",
          leadId,
          demoId: demo.id,
          slug
        }
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutUrl = `${baseUrl}/checkout?leadId=${leadId}&plan=audit`;

    return { success: true, demo, checkoutUrl };
  } catch (error) {
    console.error('Error scheduling demo:', error);
    throw new Error('Failed to schedule demo');
  }
}

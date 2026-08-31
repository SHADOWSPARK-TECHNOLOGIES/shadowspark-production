import { prisma } from "./prisma";

function checkoutUrlFor(leadId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/checkout?leadId=${leadId}&plan=audit`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function scheduleDemoForLead(leadId: string, email: string | null) {
  const slug = `demo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    const demo = await prisma.$transaction(async (transaction) => {
      // The unique Demo.leadId constraint elects one scheduling request. The
      // state change and events commit only for that winning request.
      const createdDemo = await transaction.demo.create({
        data: {
          slug,
          leadId,
          config: {
            type: "calendar_placeholder",
            scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
          },
          approved: false,
        },
      });

      await transaction.lead.update({
        where: { id: leadId },
        data: {
          status: "demo_scheduled",
          demoScheduled: true,
        },
      });

      await transaction.systemEvent.create({
        data: {
          type: "DEMO_SCHEDULED_EMAIL_SENT",
          message: `Automated demo scheduling payload dispatched to ${email || "unknown"}`,
          metadata: { leadId, demoId: createdDemo.id, slug },
        },
      });

      await transaction.systemEvent.create({
        data: {
          type: "TOOL_EXECUTION",
          message: "Demo scheduled via tool execution",
          metadata: {
            tool: "scheduleDemo",
            leadId,
            demoId: createdDemo.id,
            slug,
          },
        },
      });

      return createdDemo;
    });

    return { success: true, demo, checkoutUrl: checkoutUrlFor(leadId) };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existingDemo = await prisma.demo.findUnique({ where: { leadId } });
      if (existingDemo) {
        return {
          success: true,
          demo: existingDemo,
          checkoutUrl: checkoutUrlFor(leadId),
        };
      }
    }

    console.error("Error scheduling demo:", error);
    throw new Error("Failed to schedule demo");
  }
}

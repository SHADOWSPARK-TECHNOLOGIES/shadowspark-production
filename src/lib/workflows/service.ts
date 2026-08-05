import { prisma } from "@/lib/prisma";
import { workflowDefinitionSchema } from "@/lib/workflows/schema";

export async function createWorkflowDefinition(input: unknown) {
  const parsed = workflowDefinitionSchema.parse(input);
  const tenant = await prisma.tenant.upsert({ where: { slug: parsed.tenantId }, update: {}, create: { slug: parsed.tenantId, name: parsed.tenantId } });
  const definition = await prisma.workflowDefinition.create({
    data: {
      tenantId: tenant.id,
      key: parsed.key,
      name: parsed.name,
      description: parsed.description,
      versions: {
        create: {
          version: 1,
          triggerType: parsed.triggerType,
          schema: { nodes: parsed.nodes },
        },
      },
    },
    include: { versions: true },
  });
  return definition;
}

export async function publishWorkflowDefinition(id: string) {
  const version = await prisma.workflowVersion.findFirst({ where: { workflowDefinitionId: id }, orderBy: { version: "desc" } });
  if (!version) throw new Error("WORKFLOW_NOT_FOUND");
  return prisma.workflowVersion.update({ where: { id: version.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
}

export async function triggerWorkflow(params: { tenantId: string; workflowVersionId: string; source: string; externalRef: string; payload: Record<string, unknown>; loanApplicationId?: string; }) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: params.tenantId } });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  const trigger = await prisma.workflowTrigger.create({
    data: {
      tenantId: tenant.id,
      workflowVersionId: params.workflowVersionId,
      source: params.source,
      externalRef: params.externalRef,
      payload: params.payload,
      loanApplicationId: params.loanApplicationId,
    },
  });
  const execution = await prisma.workflowExecution.create({
    data: {
      tenantId: tenant.id,
      workflowVersionId: params.workflowVersionId,
      triggerId: trigger.id,
      idempotencyKey: `${tenant.id}:${params.workflowVersionId}:${params.source}:${params.externalRef}`,
      status: "PENDING",
      events: { create: { eventType: "TRIGGER_RECEIVED", message: "Workflow trigger accepted", payload: params.payload } },
    },
    include: { events: true },
  });
  return execution;
}

export async function listWorkflowExecutions(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  return prisma.workflowExecution.findMany({ where: { tenantId: tenant.id }, include: { events: true, nodeExecutions: true }, orderBy: { createdAt: "desc" }, take: 25 });
}

export async function getWorkflowExecution(id: string) {
  return prisma.workflowExecution.findUnique({ where: { id }, include: { events: true, nodeExecutions: true, deadLetters: true } });
}

export async function listDeadLetters(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) throw new Error("TENANT_NOT_FOUND");
  return prisma.workflowDeadLetter.findMany({ where: { execution: { tenantId: tenant.id } }, include: { execution: true }, orderBy: { createdAt: "desc" }, take: 25 });
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getLatestAudit } from "@/lib/rag/get-audit";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function pickFirstString(
  source: Record<string, unknown> | null,
  keys: string[],
  fallback: string
) {
  if (!source) return fallback;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function deriveRecommendation(
  config: Record<string, unknown> | null,
  audit: Record<string, unknown> | null
) {
  return pickFirstString(
    config ?? audit,
    ["packageRecommendation", "recommendedPackage", "tier", "plan"],
    "automation"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const demo = await prisma.demo.findUnique({
      where: { slug },
      include: {
        lead: true,
      },
    });

    const auditData = await getLatestAudit(slug);

    if (!demo) {
      // Mock data for unknown slugs so the UI doesn't crash during exploration
      return NextResponse.json({
        id: "mock-" + Date.now(),
        businessName: slug.toUpperCase().replace(/-/g, " "),
        niche: "Enterprise Infrastructure",
        packageRecommendation: "automation",
        createdAt: new Date().toISOString(),
        auditMarkdown: auditData,
      });
    }

    const miniAuditData = asRecord(demo.lead.miniAuditData);
    const config = asRecord(demo.config);

    return NextResponse.json({
      id: demo.id,
      businessName: pickFirstString(
        miniAuditData,
        ["companyName", "businessName", "name", "businessType"],
        "Enterprise Target"
      ),
      niche: pickFirstString(
        miniAuditData,
        ["niche", "businessType", "goals"],
        "Technology Strategy"
      ),
      packageRecommendation: deriveRecommendation(config, miniAuditData),
      createdAt: demo.createdAt.toISOString(),
      auditMarkdown: auditData,
    });
  } catch (error) {
    console.error("Demo fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching demo" },
      { status: 500 }
    );
  }
}

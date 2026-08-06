import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initializeTrustComponents } from "@/lib/trust/computeTruthIndex";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { id: true, riskState: true, truthIndex: true },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await initializeTrustComponents(id, prisma);

    const components = await prisma.trustComponent.findMany({
      where: { listingId: id },
      select: { label: true, passed: true, weight: true, notes: true },
    });

    return NextResponse.json({
      riskState: listing.riskState,
      truthIndex: listing.truthIndex ?? 0,
      components,
    });
  } catch (err) {
    console.error("[GET /trust]", err);
    return NextResponse.json(
      { error: "Internal error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

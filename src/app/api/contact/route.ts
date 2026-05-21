import { NextResponse } from "next/server";

export const runtime = "edge";

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  monthlyLeadVolume?: string;
  message?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ContactPayload;

  if (!payload.name?.trim() || !payload.email?.trim() || !payload.company?.trim()) {
    return NextResponse.json(
      { error: "Name, email, and company are required." },
      { status: 400 }
    );
  }

  console.log("Enterprise contact request", {
    name: payload.name,
    email: payload.email,
    company: payload.company,
    monthlyLeadVolume: payload.monthlyLeadVolume ?? "unspecified",
    message: payload.message ?? "",
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message: "Consultation request received.",
  });
}

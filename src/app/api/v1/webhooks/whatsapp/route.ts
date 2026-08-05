import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: { code: "INVALID_JSON", message: "Invalid JSON payload" } }, { status: 400 });

  return NextResponse.json({
    data: {
      channel: "whatsapp",
      tenantId: req.headers.get("x-tenant-id"),
      externalMessageId: body.messageId ?? body.id ?? null,
      from: body.from ?? null,
      to: body.to ?? null,
      text: body.text ?? body.body ?? null,
      media: body.media ?? [],
      raw: body,
    },
  });
}

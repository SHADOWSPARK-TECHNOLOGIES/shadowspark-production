import { NextResponse } from "next/server";
import { z } from "zod";
import { buildMetaPayload, hashUserData, sendToMetaAPI } from "@/lib/meta-api";
import { optionalEnv } from "@/lib/env";

const conversionsSchema = z.object({
  event_name: z.enum(["PageView", "Lead", "InitiateCheckout", "Purchase", "Contact"]),
  event_time: z.number().int().positive().optional(),
  user_data: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      client_ip_address: z.string().optional(),
      client_user_agent: z.string().optional(),
      fbc: z.string().optional(),
      fbp: z.string().optional(),
    })
    .optional(),
  custom_data: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export async function POST(request: Request) {
  const pixelId = optionalEnv("NEXT_PUBLIC_META_PIXEL_ID");
  const accessToken = optionalEnv("META_ACCESS_TOKEN");

  if (!pixelId || !accessToken) {
    return NextResponse.json({ success: false, error: "Meta configuration is missing" }, { status: 500 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = conversionsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const hashed = await hashUserData(input.user_data?.email, input.user_data?.phone);
  const userData = {
    ...input.user_data,
    ...hashed,
  };

  try {
    const metaPayload = buildMetaPayload({
      eventName: input.event_name,
      eventTime: input.event_time ?? Math.floor(Date.now() / 1000),
      userData,
      customData: input.custom_data,
    });

    const response = await sendToMetaAPI({
      pixelId,
      accessToken,
      payload: metaPayload,
    });

    return NextResponse.json({
      success: true,
      events_received: response.events_received ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send conversion event";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

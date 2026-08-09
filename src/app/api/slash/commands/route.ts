import { NextResponse } from "next/server";
import { z } from "zod";
import { dispatchSlashCommand, formatSlashResponse } from "@/lib/slash-commands";

const slashSchema = z.object({
  command: z.enum(["/demo", "/status", "/help"]),
  text: z.string().optional(),
});

async function parseBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return {
      command: params.get("command") ?? undefined,
      text: params.get("text") ?? undefined,
    };
  }

  return request.json();
}

export async function POST(request: Request) {
  const payload = await parseBody(request).catch(() => null);
  const parsed = slashSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = dispatchSlashCommand(parsed.data.command, parsed.data.text);
  return NextResponse.json({
    success: true,
    ...formatSlashResponse(result),
  });
}

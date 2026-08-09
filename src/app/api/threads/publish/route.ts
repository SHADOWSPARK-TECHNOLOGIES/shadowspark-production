import { NextResponse } from "next/server";
import { z } from "zod";
import { createThreadsPost } from "@/lib/threads-api";

const publishSchema = z.object({
  text: z.string().min(1).max(500),
  media_url: z.string().url().optional(),
  media_type: z.enum(["IMAGE", "VIDEO"]).optional(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const post = await createThreadsPost(parsed.data.text, {
      media_url: parsed.data.media_url,
      media_type: parsed.data.media_type,
    });

    return NextResponse.json({ success: true, post_id: post.post_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish to Threads";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

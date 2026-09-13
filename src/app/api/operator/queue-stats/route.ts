import { NextResponse } from "next/server";

import { crawlQueue } from "@/lib/crawl/queue";
import { leadSyncQueue } from "@/lib/leads/queue";
import { redis } from "@/lib/redis";

type QueueSnapshot = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

async function getQueueSnapshot(queue: {
  getWaitingCount: () => Promise<number>;
  getActiveCount: () => Promise<number>;
  getCompletedCount: () => Promise<number>;
  getFailedCount: () => Promise<number>;
  getDelayedCount: () => Promise<number>;
}): Promise<QueueSnapshot> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function GET() {
  if (redis === null) {
    const inlineSnapshot: QueueSnapshot = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
    return NextResponse.json({
      mode: "inline",
      crawl: inlineSnapshot,
      leads: inlineSnapshot,
      generatedAt: new Date().toISOString(),
    });
  }

  try {
    const [crawl, leads] = await Promise.all([
      getQueueSnapshot(crawlQueue),
      getQueueSnapshot(leadSyncQueue),
    ]);

    return NextResponse.json({
      crawl,
      leads,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[operator][queue-stats] failed to read queue metrics", error);

    return NextResponse.json(
      { error: "Unable to read queue statistics." },
      { status: 500 }
    );
  }
}

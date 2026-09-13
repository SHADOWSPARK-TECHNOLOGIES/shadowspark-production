/** Result returned when a BullMQ job runs in the caller process. */
export interface InlineJobResult<TData, TResult> {
  /** Synthetic identifier preserving the queue helper's job-like contract. */
  id: string;
  /** BullMQ job name that would have been queued. */
  name: string;
  /** Original job payload. */
  data: TData;
  /** Value returned by the inline processor. */
  returnvalue: TResult;
  /** Distinguishes inline completion from a queued BullMQ job. */
  inline: true;
}

interface DispatchQueueJobOptions<TData, TQueuedResult, TInlineResult> {
  redisAvailable: boolean;
  queueName: string;
  jobName: string;
  data: TData;
  enqueue: () => Promise<TQueuedResult>;
  runInline: () => Promise<TInlineResult>;
}

let inlineFallbackLogged = false;

function logInlineFallbackOnce(queueName: string): void {
  if (inlineFallbackLogged) return;

  inlineFallbackLogged = true;
  console.warn(
    `[queues] REDIS_URL is not set; running BullMQ jobs inline (first queue: ${queueName}).`,
  );
}

/**
 * Sends a job to BullMQ when Redis exists, otherwise runs its processor inline.
 *
 * @param options - Queue metadata and configured/inline execution callbacks.
 * @returns The unchanged BullMQ result or a job-like inline completion result.
 */
export async function dispatchQueueJob<TData, TQueuedResult, TInlineResult>(
  options: DispatchQueueJobOptions<TData, TQueuedResult, TInlineResult>,
): Promise<TQueuedResult | InlineJobResult<TData, TInlineResult>> {
  if (options.redisAvailable) {
    return options.enqueue();
  }

  logInlineFallbackOnce(options.queueName);
  const returnvalue = await options.runInline();
  return {
    id: `inline-${crypto.randomUUID()}`,
    name: options.jobName,
    data: options.data,
    returnvalue,
    inline: true,
  };
}

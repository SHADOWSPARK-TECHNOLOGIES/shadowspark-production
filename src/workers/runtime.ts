type WorkerServiceEnvironment = Record<string, string | undefined>;

export function assertWorkerServiceEnabled(
  env: WorkerServiceEnvironment,
): void {
  if (env.WORKERS_ENABLED !== "true") {
    throw new Error(
      "Dedicated worker startup requires WORKERS_ENABLED=true.",
    );
  }
}

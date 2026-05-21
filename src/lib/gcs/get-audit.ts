import { Storage } from "@google-cloud/storage";
import { requireEnv } from "@/lib/env";

const storage = new Storage({
  projectId: requireEnv("GOOGLE_PROJECT_ID"),
});

const bucketName = requireEnv("VAULT_BUCKET");

export async function getAuditFile(slug: string): Promise<string | null> {
  const bucket = storage.bucket(bucketName);
  const filePath = `audits/${slug.toLowerCase()}/latest.md`;
  const file = bucket.file(filePath);

  const [exists] = await file.exists();
  if (!exists) {
    return null;
  }

  const [content] = await file.download();
  return content.toString("utf8");
}

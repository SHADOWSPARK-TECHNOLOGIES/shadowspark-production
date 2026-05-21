import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";
import { prisma } from "@/lib/prisma";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const model = google.textEmbeddingModel("gemini-embedding-001");

export async function generateAndStoreEmbedding(text: string, source: string, type: string) {
  const { embedding } = await embed({
    model,
    value: text,
  });

  return await prisma.embedding.create({
    data: {
      content: text,
      embedding,
      source,
      type,
    },
  });
}

export async function getEmbedding(text: string) {
  const { embedding } = await embed({
    model,
    value: text,
  });
  return embedding;
}

-- Enable pgvector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to leads if not present
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS lead_embedding_idx
ON "Lead" USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);

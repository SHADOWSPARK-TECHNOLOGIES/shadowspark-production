export type RagEmbeddingChunk = {
  id: string;
  url?: string;
  title?: string;
  text: string;
  embedding: number[];
};

export type RagEmbeddingIndex = {
  version: 1;
  createdAt: string;
  embeddingModel: string;
  source: {
    rootUrl: string;
  };
  chunks: RagEmbeddingChunk[];
};


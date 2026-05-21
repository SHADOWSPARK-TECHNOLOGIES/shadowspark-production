import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embedMany } from "ai";
async function test() {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = google.textEmbeddingModel("gemini-embedding-001");
  try {
    const res = await embedMany({ model, values: ["hello world"] });
    console.log("Success with gemini-embedding-001:", res.embeddings.length);
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}
test();

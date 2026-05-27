import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { embed } from "./llm";

export interface RetrievedChunk {
  id: string;
  content: string;
  distance: number;
}

// pgvector cosine: distance ranges roughly 0 (identical) → ~2 (opposite). In
// practice text-embedding-3-small embeddings cluster at:
//   <0.35 → highly relevant
//   0.35–0.55 → loosely related
//   >0.55 → mostly unrelated topic
// We drop anything above the threshold so the LLM never sees an irrelevant
// chunk it could pattern-match into a hallucinated answer.
const MAX_DISTANCE = 0.55;

export async function retrieve(
  tenantId: string,
  query: string,
  k = env.AI_RAG_TOP_K,
): Promise<RetrievedChunk[]> {
  const vec = await embed(query);
  const literal = `[${vec.join(",")}]`;

  // Over-fetch so we can apply the distance filter without ending up empty.
  const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT id, content, ("embedding" <=> $1::vector) AS distance
       FROM "KnowledgeChunk"
      WHERE "tenantId" = $2 AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> $1::vector
      LIMIT $3`,
    literal,
    tenantId,
    k * 2,
  );
  return rows.filter((r) => r.distance <= MAX_DISTANCE).slice(0, k);
}

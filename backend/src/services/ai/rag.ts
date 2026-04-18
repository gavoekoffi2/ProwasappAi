import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { embed } from "./llm";

export interface RetrievedChunk {
  id: string;
  content: string;
  distance: number;
}

// pgvector cosine similarity — `<=>` returns distance (smaller = closer).
// We format the embedding as a pgvector literal: '[v1,v2,...]'.
export async function retrieve(
  tenantId: string,
  query: string,
  k = env.AI_RAG_TOP_K,
): Promise<RetrievedChunk[]> {
  const vec = await embed(query);
  const literal = `[${vec.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<RetrievedChunk[]>(
    `SELECT id, content, ("embedding" <=> $1::vector) AS distance
       FROM "KnowledgeChunk"
      WHERE "tenantId" = $2 AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> $1::vector
      LIMIT $3`,
    literal,
    tenantId,
    k,
  );
  return rows;
}

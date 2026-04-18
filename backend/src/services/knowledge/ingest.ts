import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import pdfParse from "pdf-parse";
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { embedMany } from "../ai/llm";

const CHUNK_SIZE = 800;       // characters
const CHUNK_OVERLAP = 120;

export async function extractText(buf: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const r = await pdfParse(buf);
    return r.text ?? "";
  }
  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return buf.toString("utf8");
  }
  return buf.toString("utf8");
}

export function chunk(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!cleaned) return [];

  const out: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(i + CHUNK_SIZE, cleaned.length);
    let sliceEnd = end;
    if (end < cleaned.length) {
      const br = cleaned.lastIndexOf("\n\n", end);
      const dot = cleaned.lastIndexOf(". ", end);
      const candidate = Math.max(br, dot);
      if (candidate > i + CHUNK_SIZE / 2) sliceEnd = candidate + 1;
    }
    out.push(cleaned.slice(i, sliceEnd).trim());
    if (sliceEnd >= cleaned.length) break;
    i = sliceEnd - CHUNK_OVERLAP;
    if (i < 0) i = 0;
  }
  return out.filter((c) => c.length > 30);
}

function newId() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

// Ingest runs asynchronously from the HTTP request. Failure is captured on
// the document row so the UI can surface it.
export async function ingestDocument(documentId: string) {
  const doc = await prisma.knowledgeDocument.findUnique({ where: { id: documentId } });
  if (!doc) return;

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { status: "processing", error: null },
  });

  try {
    const filePath = path.join(process.cwd(), "uploads", `${documentId}.bin`);
    const buf = await fs.readFile(filePath);
    const text = await extractText(buf, doc.mimeType);
    const parts = chunk(text);
    if (parts.length === 0) throw new Error("No usable content extracted");

    const vectors = await embedMany(parts);

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
      for (let j = 0; j < parts.length; j++) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "KnowledgeChunk"
             (id, "tenantId", "documentId", position, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          newId(),
          doc.tenantId,
          doc.id,
          j,
          parts[j],
          `[${vectors[j].join(",")}]`,
        );
      }
    });

    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "ready" },
    });
  } catch (err) {
    logger.error({ err, documentId }, "ingest failed");
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "failed", error: (err as Error).message },
    });
  }
}

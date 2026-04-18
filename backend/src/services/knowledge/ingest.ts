import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
// Import pdf-parse from its internal entry to avoid its index.js debug hack
// that tries to read a demo PDF at require-time when `module.parent` is null.
// See https://gitlab.com/autokent/pdf-parse/-/issues/24.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");
import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { embedMany } from "../ai/llm";

const CHUNK_SIZE = 800;        // characters
const CHUNK_OVERLAP = 120;
const INSERT_BATCH = 100;      // chunks per transaction batch

export async function extractText(buf: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const r = await pdfParse(buf);
    return r.text ?? "";
  }
  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return buf.toString("utf8");
  }
  // Heuristic fallback for files uploaded with the wrong mime type.
  if (buf.slice(0, 4).toString() === "%PDF") {
    const r = await pdfParse(buf);
    return r.text ?? "";
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
  // CUID-ish random id. Collisions practically impossible at our scale.
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

    // Wipe any previous chunks for this doc and bulk-insert new ones.
    await prisma.$transaction(async (tx) => {
      await tx.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });

      for (let start = 0; start < parts.length; start += INSERT_BATCH) {
        const slice = parts.slice(start, start + INSERT_BATCH);
        const vslice = vectors.slice(start, start + INSERT_BATCH);

        const rows = slice.map((_, j) => {
          const b = j * 6;
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}::vector)`;
        });
        const params: unknown[] = [];
        slice.forEach((content, j) => {
          params.push(
            newId(),
            doc.tenantId,
            doc.id,
            start + j,
            content,
            `[${vslice[j].join(",")}]`,
          );
        });

        await tx.$executeRawUnsafe(
          `INSERT INTO "KnowledgeChunk"
             (id, "tenantId", "documentId", position, content, embedding)
           VALUES ${rows.join(", ")}`,
          ...params,
        );
      }
    });

    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "ready" },
    });
    logger.info({ documentId, chunks: parts.length }, "document ingested");
  } catch (err) {
    logger.error({ err, documentId }, "ingest failed");
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { status: "failed", error: (err as Error).message },
    });
  }
}

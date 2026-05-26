import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import fs from "fs/promises";
import path from "path";
import type { Request } from "express";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler, badRequest, notFound } from "../../utils/errors";
import { ingestDocument } from "../../services/knowledge/ingest";

export const knowledgeRouter = Router();

// Cap per-tenant uploads so a single bad actor can't flood the ingest pipeline
// or the embedding budget. 20 uploads/min/tenant is generous for real usage.
const uploadLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.auth?.tenantId ?? req.ip ?? "anon",
  message: { error: "Trop d'imports en peu de temps. Réessayez dans une minute." },
});

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

// Accept only the formats the ingest pipeline can actually parse.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);
const ALLOWED_EXT = new Set([".pdf", ".txt", ".md"]);

// Per-tenant cap on total KB storage (sum of sizeBytes across docs).
// Starter-tier users uploading 50 MB of PDFs will already dwarf their
// monthly AI spend — cap it so a single tenant can't exhaust the disk.
const TENANT_STORAGE_MAX_MB = 200;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_MB * 1024 * 1024 },
});

knowledgeRouter.use(requireAuth, tenantScope);

knowledgeRouter.get(
  "/documents",
  asyncHandler(async (req, res) => {
    const docs = await prisma.knowledgeDocument.findMany({
      where: { tenantId: req.auth!.tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  }),
);

knowledgeRouter.post(
  "/documents",
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest("file is required");

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) && !ALLOWED_EXT.has(ext)) {
      throw badRequest("Format non supporté. Utilisez PDF, TXT ou MD.");
    }

    // Enforce per-tenant storage quota before persisting the upload.
    const agg = await prisma.knowledgeDocument.aggregate({
      where: { tenantId: req.auth!.tenantId },
      _sum: { sizeBytes: true },
    });
    const usedBytes = Number(agg._sum.sizeBytes ?? 0);
    const maxBytes = TENANT_STORAGE_MAX_MB * 1024 * 1024;
    if (usedBytes + file.size > maxBytes) {
      throw badRequest(
        `Quota de stockage atteint (${TENANT_STORAGE_MAX_MB} MB). Supprimez des documents.`,
      );
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        tenantId: req.auth!.tenantId,
        name: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        status: "pending",
      },
    });

    // Persist raw file so the ingest worker can re-read it.
    await fs.writeFile(path.join(UPLOAD_DIR, `${doc.id}.bin`), file.buffer);

    // Fire-and-forget ingest; status will update on the row.
    ingestDocument(doc.id).catch(() => {});

    res.status(202).json(doc);
  }),
);

knowledgeRouter.delete(
  "/documents/:id",
  asyncHandler(async (req, res) => {
    const doc = await prisma.knowledgeDocument.findFirst({
      where: { id: req.params.id, tenantId: req.auth!.tenantId },
    });
    if (!doc) throw notFound();
    await prisma.knowledgeDocument.delete({ where: { id: doc.id } });
    await fs.unlink(path.join(UPLOAD_DIR, `${doc.id}.bin`)).catch(() => {});
    res.json({ ok: true });
  }),
);

import { Router } from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { tenantScope } from "../../middleware/tenantScope";
import { asyncHandler, badRequest, notFound } from "../../utils/errors";
import { ingestDocument } from "../../services/knowledge/ingest";

export const knowledgeRouter = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
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
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest("file is required");

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

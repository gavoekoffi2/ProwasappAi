import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { whatsapp, type InboundEvent } from "./sessionManager";
import { stt } from "../voice/stt";
import { handleConversation } from "../ai/orchestrator";
import { incrementUsage } from "../billing/usage";

// Subscribe to Baileys inbound events and run the full pipeline:
//   1. persist the Message (with transcription if audio)
//   2. upsert the Conversation
//   3. hand off to the AI orchestrator
export function startInboundWorker() {
  whatsapp.on("inbound", async (ev: InboundEvent) => {
    try {
      await process(ev);
    } catch (err) {
      logger.error({ err, ev: { ...ev, media: undefined } }, "inbound pipeline failed");
    }
  });
  logger.info("inbound worker started");
}

async function process(ev: InboundEvent) {
  const convo = await prisma.conversation.upsert({
    where: { sessionId_remoteJid: { sessionId: ev.sessionId, remoteJid: ev.remoteJid } },
    create: {
      tenantId: ev.tenantId,
      sessionId: ev.sessionId,
      remoteJid: ev.remoteJid,
      displayName: ev.displayName,
      mode: "ai",
      unread: 1,
    },
    update: {
      displayName: ev.displayName,
      lastAt: new Date(),
      unread: { increment: 1 },
    },
  });

  let text = ev.text ?? "";
  let transcription: string | undefined;
  let type: "text" | "audio" | "image" | "document" = "text";

  if (ev.kind === "audio" && ev.media) {
    type = "audio";
    const r = await stt(ev.media, ev.mimeType).catch(() => ({ text: "", durationSec: 0 }));
    transcription = r.text;
    text = r.text;
    if (r.durationSec) {
      await incrementUsage(ev.tenantId, { sttSeconds: Math.ceil(r.durationSec) });
    }
  } else if (ev.kind === "image") {
    type = "image";
  } else if (ev.kind === "document") {
    type = "document";
  }

  await prisma.message.create({
    data: {
      tenantId: ev.tenantId,
      conversationId: convo.id,
      direction: "inbound",
      type,
      text: ev.text ?? null,
      transcription: transcription ?? null,
      waMessageId: ev.waMessageId,
    },
  });
  await incrementUsage(ev.tenantId, { messagesIn: 1 });

  // Only trigger the AI if we have a usable prompt.
  const userText = (text || "").trim();
  if (!userText) return;

  await handleConversation(
    { tenantId: ev.tenantId, conversationId: convo.id, userText },
    whatsapp,
  );
}

import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { chat, type ChatMessage } from "./llm";
import { retrieve } from "./rag";
import { industryHints } from "./prompts";
import type { IWhatsappAdapter } from "../whatsapp/adapter";
import { tts } from "../voice/tts";
import { isOverQuota, incrementUsage } from "../billing/usage";

const HANDOFF_SENTINEL = "[[HANDOFF]]";

export interface HandleInput {
  tenantId: string;
  conversationId: string;
  userText: string;
}

export async function handleConversation(
  input: HandleInput,
  adapter: IWhatsappAdapter,
): Promise<void> {
  const { tenantId, conversationId, userText } = input;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      session: true,
      tenant: { include: { aiConfig: true, subscription: true } },
    },
  });
  if (!conversation) return;
  if (conversation.mode === "human") return; // human handoff in progress

  const cfg = conversation.tenant.aiConfig;
  if (!cfg?.enabled) return;

  // Quota check — we still accept inbound messages, we just don't reply with AI.
  if (await isOverQuota(tenantId)) {
    logger.warn({ tenantId }, "quota exceeded — AI muted");
    return;
  }

  // Build memory (last N turns).
  const recent = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: env.AI_CONTEXT_TURNS * 2,
  });
  const history: ChatMessage[] = recent
    .reverse()
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.transcription ?? m.text ?? "",
    }))
    .filter((m) => m.content);

  // RAG
  const chunks = await retrieve(tenantId, userText).catch(() => []);
  const knowledgeBlock = chunks.length
    ? `\n\nInformations vérifiées (utilise-les en priorité; ne cite pas les sources):\n${chunks
        .map((c, i) => `[${i + 1}] ${c.content}`)
        .join("\n---\n")}`
    : "";

  const systemPrompt = [
    cfg.systemPrompt || "Tu es un assistant WhatsApp professionnel.",
    industryHints[conversation.tenant.industry] ?? "",
    `Ton: ${cfg.tone}. Langue par défaut: ${cfg.language}, mais adapte-toi à la langue du client.`,
    `Si tu n'es pas sûr à au moins ${Math.round(cfg.confidenceFallback * 100)}%, réponds uniquement par: ${HANDOFF_SENTINEL}`,
    "Reste bref (2-4 phrases), clair, et propose la prochaine étape.",
    knowledgeBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  let replyText = "";
  try {
    replyText = await chat(messages);
  } catch (err) {
    logger.error({ err }, "LLM call failed");
    replyText = HANDOFF_SENTINEL;
  }

  if (replyText.includes(HANDOFF_SENTINEL) || !replyText.trim()) {
    // Switch to human mode, send polite fallback.
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { mode: "human" },
    });
    await sendAndLog(adapter, conversation, cfg.fallbackMessage, false);
    return;
  }

  await sendAndLog(adapter, conversation, replyText, true, cfg.voiceReply);
  await incrementUsage(tenantId, { messagesOut: 1, aiReplies: 1 });
}

async function sendAndLog(
  adapter: IWhatsappAdapter,
  conversation: { id: string; tenantId: string; sessionId: string; remoteJid: string },
  text: string,
  aiGenerated: boolean,
  voiceReply = false,
) {
  let waId: string | null = null;
  let type: "text" | "audio" = "text";
  if (voiceReply) {
    const audio = await tts(text).catch(() => null);
    if (audio) {
      waId = await adapter.send(conversation.sessionId, conversation.remoteJid, {
        type: "audio",
        audio,
      });
      type = "audio";
    }
  }
  if (!waId) {
    waId = await adapter.send(conversation.sessionId, conversation.remoteJid, {
      type: "text",
      text,
    });
    type = "text";
  }
  await prisma.message.create({
    data: {
      tenantId: conversation.tenantId,
      conversationId: conversation.id,
      direction: "outbound",
      type,
      text,
      aiGenerated,
      waMessageId: waId ?? undefined,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastAt: new Date() },
  });
}

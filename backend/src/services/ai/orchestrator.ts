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
    .map<ChatMessage>((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.transcription ?? m.text ?? "",
    }))
    .filter((m) => m.content);

  // RAG — only chunks above the relevance threshold reach the LLM.
  const chunks = await retrieve(tenantId, userText).catch(() => []);
  const knowledgeBlock = chunks.length
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n---\n")
    : "(aucune information vérifiée disponible pour cette question)";

  // Hard ground rules. Order matters — Whisper/GPT pay more attention to
  // earlier system content, so the anti-hallucination rules come first.
  const groundRules = [
    "RÈGLES STRICTES — à respecter sans exception :",
    "",
    "1. Tu réponds UNIQUEMENT à partir des « Informations vérifiées » fournies plus bas. Tu n'inventes JAMAIS : ni produit, ni prix, ni horaire, ni adresse, ni stock, ni délai, ni condition de livraison, ni promotion, ni numéro de contact.",
    "2. Pour les salutations et politesses (« bonjour », « merci », « ça va »…), tu peux répondre normalement sans information spécifique.",
    "3. Si la question du client porte sur une info factuelle (produit, prix, dispo, livraison, horaires, contact, conditions…) et que cette info n'est PAS clairement présente dans les « Informations vérifiées », tu réponds exactement par cette phrase (et rien d'autre) :",
    '   "Bonne question 🙏 Je vérifie cette information avec notre équipe et je reviens vers vous très vite."',
    `   Puis tu ajoutes le mot magique sur sa propre ligne : ${HANDOFF_SENTINEL}`,
    "4. Quand tu utilises une info des « Informations vérifiées », n'écris jamais les numéros [1], [2]… ni le mot « source ». Reformule naturellement.",
    "5. Reste bref (2 à 4 phrases), naturel, dans la LANGUE du client.",
  ].join("\n");

  const persona = cfg.systemPrompt?.trim()
    ? `Persona : ${cfg.systemPrompt.trim()}`
    : `Persona : Tu es l'assistant WhatsApp de "${conversation.tenant.name}".`;

  const systemPrompt = [
    persona,
    industryHints[conversation.tenant.industry] ?? "",
    `Ton : ${cfg.tone}. Langue par défaut : ${cfg.language}, mais adapte-toi à celle du client.`,
    groundRules,
    `Informations vérifiées (issues de la base de connaissances du commerçant) :\n${knowledgeBlock}`,
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

  const hasHandoff = replyText.includes(HANDOFF_SENTINEL);
  const cleaned = replyText.replace(HANDOFF_SENTINEL, "").trim();

  if (hasHandoff || !cleaned) {
    // The LLM didn't have enough information. We send its polite "I'll check"
    // wording (it was instructed to write one) — or fall back to the tenant
    // default if it skipped straight to the sentinel — and flip the
    // conversation into human mode so the merchant sees an alert.
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { mode: "human", unread: { increment: 1 } },
    });
    await sendAndLog(adapter, conversation, cleaned || cfg.fallbackMessage, false);
    return;
  }

  await sendAndLog(adapter, conversation, cleaned, true, cfg.voiceReply);
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

-- Initial migration: enums, tables, pgvector column + index.

CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin', 'agent');
CREATE TYPE "Industry" AS ENUM ('ecommerce', 'realestate', 'services', 'other');
CREATE TYPE "Plan" AS ENUM ('starter', 'pro', 'business');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE "WhatsappSessionStatus" AS ENUM ('pending', 'qr', 'connecting', 'connected', 'disconnected', 'error');
CREATE TYPE "ConversationMode" AS ENUM ('ai', 'human');
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "MessageType" AS ENUM ('text', 'audio', 'image', 'document', 'system');
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'processing', 'ready', 'failed');

-- Tenants & users
CREATE TABLE "Tenant" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "industry" "Industry" NOT NULL DEFAULT 'other',
  "locale" TEXT NOT NULL DEFAULT 'fr',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'owner',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- Billing
CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "plan" "Plan" NOT NULL DEFAULT 'starter',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "externalId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "UsageCounter" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "period" TEXT NOT NULL,
  "messagesIn" INTEGER NOT NULL DEFAULT 0,
  "messagesOut" INTEGER NOT NULL DEFAULT 0,
  "aiReplies" INTEGER NOT NULL DEFAULT 0,
  "sttSeconds" INTEGER NOT NULL DEFAULT 0,
  "ttsChars" INTEGER NOT NULL DEFAULT 0,
  UNIQUE ("tenantId", "period")
);
CREATE INDEX "UsageCounter_tenantId_idx" ON "UsageCounter"("tenantId");

-- AI
CREATE TABLE "AiConfig" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL UNIQUE REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "tone" TEXT NOT NULL DEFAULT 'friendly',
  "language" TEXT NOT NULL DEFAULT 'fr',
  "voiceReply" BOOLEAN NOT NULL DEFAULT false,
  "fallbackMessage" TEXT NOT NULL DEFAULT 'Un agent va vous répondre sous peu.',
  "confidenceFallback" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- WhatsApp
CREATE TABLE "WhatsappSession" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "label" TEXT NOT NULL DEFAULT 'Main',
  "phone" TEXT,
  "status" "WhatsappSessionStatus" NOT NULL DEFAULT 'pending',
  "lastQr" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "WhatsappSession_tenantId_idx" ON "WhatsappSession"("tenantId");

-- Conversations & messages
CREATE TABLE "Conversation" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "sessionId" TEXT NOT NULL REFERENCES "WhatsappSession"("id") ON DELETE CASCADE,
  "remoteJid" TEXT NOT NULL,
  "displayName" TEXT,
  "mode" "ConversationMode" NOT NULL DEFAULT 'ai',
  "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unread" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("sessionId", "remoteJid")
);
CREATE INDEX "Conversation_tenantId_lastAt_idx" ON "Conversation"("tenantId", "lastAt");

CREATE TABLE "Message" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"("id") ON DELETE CASCADE,
  "direction" "MessageDirection" NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'text',
  "text" TEXT,
  "mediaUrl" TEXT,
  "transcription" TEXT,
  "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "waMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_tenantId_createdAt_idx" ON "Message"("tenantId", "createdAt");

-- Knowledge base
CREATE TABLE "KnowledgeDocument" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "KnowledgeDocument_tenantId_idx" ON "KnowledgeDocument"("tenantId");

CREATE TABLE "KnowledgeChunk" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "embedding" vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "KnowledgeChunk_tenantId_idx" ON "KnowledgeChunk"("tenantId");
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");
CREATE INDEX "KnowledgeChunk_embedding_idx"
  ON "KnowledgeChunk"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

# ProwasappAI

> WhatsApp AI Automation SaaS for African Businesses.

Automate your WhatsApp conversations with AI agents — trained on your business
knowledge, capable of handling text **and voice notes**, built for unstable
networks and low-cost infrastructure.

**Target market:** Francophone Africa (Togo, Côte d'Ivoire, Sénégal, Bénin,
Cameroun, …) and anywhere WhatsApp is the primary customer channel.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Repository layout](#repository-layout)
5. [Quick start (Docker)](#quick-start-docker)
6. [Manual development setup](#manual-development-setup)
7. [Environment variables](#environment-variables)
8. [Database schema](#database-schema)
9. [API overview](#api-overview)
10. [WhatsApp integration](#whatsapp-integration)
11. [AI pipeline (RAG + chat)](#ai-pipeline-rag--chat)
12. [Voice pipeline](#voice-pipeline)
13. [SaaS / billing](#saas--billing)
14. [Deployment](#deployment)
15. [Roadmap](#roadmap)

---

## Architecture

```
                                  ┌────────────────────────────┐
                                  │   Next.js Dashboard (UI)   │
                                  │  React + Tailwind + SWR    │
                                  └────────────┬───────────────┘
                                               │ REST + WebSocket
                                               ▼
┌─────────────────┐    Baileys    ┌────────────────────────────┐     ┌───────────────┐
│  WhatsApp Web   │◀─────────────▶│   Node.js / Express API    │────▶│   PostgreSQL  │
│  (per-tenant)   │               │   (multi-tenant, JWT)      │     └───────────────┘
└─────────────────┘               │                            │     ┌───────────────┐
                                  │   Modules:                 │────▶│     Redis     │
                                  │   • Auth / Tenants         │     └───────────────┘
                                  │   • WhatsApp Session Mgr   │     ┌───────────────┐
                                  │   • AI Orchestrator (RAG)  │────▶│  Vector Store │
                                  │   • Knowledge Ingestion    │     │ (pgvector)    │
                                  │   • Voice (STT/TTS)        │     └───────────────┘
                                  │   • Billing / Usage        │
                                  └────────────┬───────────────┘
                                               │
                                               ▼
                          ┌───────────────────────────────────────┐
                          │ LLM APIs  │  Whisper STT  │  TTS API  │
                          └───────────────────────────────────────┘
```

Every business is an isolated **tenant**. Each tenant owns one or more
WhatsApp sessions, a knowledge base, conversations, an AI config, and a
subscription.

## Features

### MVP (implemented in this repo)

- 🔗 **WhatsApp Web integration** via Baileys — QR login, multi-session,
  real-time inbound/outbound messaging.
- 🤖 **AI chat engine** with per-tenant prompt, conversation memory,
  industry-specific defaults (e-commerce, real estate, services).
- 📂 **Knowledge base** — upload PDF / TXT, chunk + embed, retrieve top-k
  chunks per reply (RAG).
- 💬 **Conversation dashboard** — list conversations, read history, send
  replies, take over from the AI ("human handoff").
- 🎙️ **Voice support** — Whisper STT on incoming WhatsApp voice notes, TTS
  reply option for each tenant.
- ⚡ **Auto-reply** with confidence-based fallback ("let me get a human on
  this").
- 🔐 **Auth & multi-tenant** — JWT, per-tenant data isolation.
- 💰 **Subscription & usage tracking** — free trial, message / voice-minute
  counters, simple plan gates.

### Designed in (plug-in ready)

- Bulk WhatsApp campaigns (`services/campaigns` stub)
- SMS channel (`channels/sms` adapter interface)
- CRM contacts (`modules/crm`)
- Admin panel (role=`admin` already on the `User` model)

## Tech stack

| Layer       | Choice                                                    |
|-------------|-----------------------------------------------------------|
| Frontend    | Next.js 14 (App Router), React, Tailwind, SWR             |
| Backend     | Node.js 20, Express, TypeScript                           |
| DB          | PostgreSQL 16 + **pgvector** extension                    |
| Cache / PubSub | Redis 7                                                |
| ORM         | Prisma                                                    |
| WhatsApp    | [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) |
| LLM         | OpenAI-compatible (swap for Claude, Mixtral, local Ollama)|
| Embeddings  | OpenAI `text-embedding-3-small` (swap-able)               |
| STT         | OpenAI Whisper API (swap for local `whisper.cpp`)         |
| TTS         | OpenAI TTS (swap for ElevenLabs / Google / Coqui)         |
| Infra       | Docker + Docker Compose (1 VPS deployable)                |

## Repository layout

```
ProwasappAi/
├── backend/              Express + Prisma API, WhatsApp workers, AI pipeline
├── frontend/             Next.js dashboard
├── docker-compose.yml    One-command local / VPS deploy
├── .env.example          All env vars
└── README.md
```

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — at minimum set OPENAI_API_KEY, JWT_SECRET, POSTGRES_PASSWORD.

docker compose up --build
```

- Dashboard → http://localhost:3000
- API       → http://localhost:4000
- Postgres  → localhost:5432
- Redis     → localhost:6379

On first boot the backend auto-runs `prisma migrate deploy`.

## Manual development setup

```bash
# 1. Infra
docker compose up -d postgres redis

# 2. Backend
cd backend
npm install
npx prisma migrate dev
npm run dev              # http://localhost:4000

# 3. Frontend
cd ../frontend
npm install
npm run dev              # http://localhost:3000
```

## Environment variables

See `.env.example`. The important ones:

| Var                   | Purpose                                            |
|-----------------------|----------------------------------------------------|
| `DATABASE_URL`        | Postgres connection string                         |
| `REDIS_URL`           | Redis connection string                            |
| `JWT_SECRET`          | Auth signing key                                   |
| `OPENAI_API_KEY`      | LLM + embeddings + Whisper + TTS (default provider)|
| `LLM_MODEL`           | e.g. `gpt-4o-mini`                                 |
| `EMBEDDING_MODEL`     | e.g. `text-embedding-3-small`                      |
| `STT_PROVIDER`        | `openai` \| `local`                                |
| `TTS_PROVIDER`        | `openai` \| `elevenlabs` \| `none`                 |
| `WA_SESSIONS_DIR`     | Where Baileys stores auth state                    |
| `APP_URL`             | Public URL for frontend (CORS)                     |

## Database schema

Main tables (see `backend/prisma/schema.prisma`):

- `User`           — auth, role, locale
- `Tenant`         — a business; every row in other tables is scoped here
- `Subscription`   — plan, status, trial, period
- `UsageCounter`   — per-month messages / stt-seconds / tts-chars
- `WhatsappSession`— one per connected number, Baileys auth state on disk
- `Conversation`   — one per remote JID
- `Message`        — inbound / outbound, text / audio / image, aiGenerated
- `KnowledgeDocument` + `KnowledgeChunk` (with `vector` column) — RAG
- `AiConfig`       — prompt, industry, tone, fallback behaviour, voice on/off

## API overview

All routes are prefixed `/api/v1` and require `Authorization: Bearer <jwt>`
except `/auth/*`.

```
POST   /auth/register
POST   /auth/login
GET    /auth/me

GET    /tenant                        current tenant
PATCH  /tenant                        update name, industry

GET    /ai-config
PUT    /ai-config                     prompt, tone, voice-reply toggle

GET    /whatsapp/sessions
POST   /whatsapp/sessions             create + return QR
DELETE /whatsapp/sessions/:id
GET    /whatsapp/sessions/:id/qr      SSE stream of QR until connected

GET    /conversations
GET    /conversations/:id/messages
POST   /conversations/:id/messages    manual reply (human takeover)
POST   /conversations/:id/handoff     toggle ai/human

POST   /knowledge/documents           multipart upload
GET    /knowledge/documents
DELETE /knowledge/documents/:id

GET    /billing/subscription
POST   /billing/subscription          change plan (stub)
GET    /billing/usage
```

## WhatsApp integration

See `backend/src/services/whatsapp/`.

- `SessionManager` keeps one Baileys socket per `WhatsappSession` row.
- Auth state persisted in `WA_SESSIONS_DIR/<sessionId>` via
  `useMultiFileAuthState` → survives restarts.
- QR is pushed via SSE to `/whatsapp/sessions/:id/qr`.
- Inbound `messages.upsert` events → normalized `Message` rows → enqueued
  for the AI worker.
- Outbound replies go back through the same socket.

Because the official Cloud API is gated and expensive, Baileys is the
right choice for Africa-first pricing. It's swappable: the code only
talks to an `IWhatsappAdapter` interface.

## AI pipeline (RAG + chat)

See `backend/src/services/ai/`.

1. Inbound text (or transcribed voice) arrives as a `Message`.
2. `AiOrchestrator.handle(conversationId, text)`:
   1. Loads the tenant's `AiConfig` + recent N messages (memory).
   2. Embeds the query → pgvector similarity search over
      `KnowledgeChunk` (top-k = 4, tenant-scoped).
   3. Builds a prompt:
      - system = tenant prompt + industry template + retrieved chunks
      - history = last 10 turns
      - user = current text
   4. Calls the LLM. If the model replies with the sentinel
      `[[HANDOFF]]` or confidence score < threshold → flips the
      conversation to human mode and sends a polite fallback.
   5. Saves the outgoing `Message`, pushes via WhatsApp adapter, updates
      `UsageCounter.messages`.

Embeddings + LLM calls are cached in Redis (keyed by hash of input) to
save cost.

## Voice pipeline

See `backend/src/services/voice/`.

- **Incoming audio**: Baileys delivers OGG/Opus → saved to tmp →
  `stt.transcribe()` → resulting text is fed into the normal AI pipeline.
- **Outgoing voice** (when `AiConfig.voiceReply = true`): the AI reply
  is sent to `tts.synthesize()` → OGG/Opus → sent back as a WhatsApp
  voice note.

Both STT and TTS are behind provider interfaces so you can run Whisper
locally on the VPS to cut API cost.

## SaaS / billing

- `Subscription.status`: `trialing` | `active` | `past_due` | `canceled`
- On register, a tenant gets a 7-day trial on the `starter` plan.
- `UsageCounter` is upserted per (tenant, yyyy-mm). Middleware
  `enforceQuota` blocks AI replies when over plan limit — conversations
  keep coming in, but AI stays silent and the dashboard nags to upgrade.
- Payments stub: `services/billing/provider.ts` has `StripeProvider` and
  a `ManualProvider` (mobile money) — pick one via `BILLING_PROVIDER`.

## Deployment

Minimum viable VPS (tested target: 2 vCPU / 4 GB / 60 GB — ~$12/mo):

```bash
# On the VPS
git clone <this-repo> && cd ProwasappAi
cp .env.example .env && vi .env   # set secrets + APP_URL=https://your.domain
docker compose --profile prod up -d
```

Put a reverse proxy (Caddy / Nginx / Traefik) in front of port 3000 for
the dashboard and 4000 for the API. Example Caddyfile:

```
your.domain {
  reverse_proxy localhost:3000
}
api.your.domain {
  reverse_proxy localhost:4000
}
```

### Backups

Postgres data lives in a Docker volume (`pgdata`). A nightly `pg_dump`
cron is included in `docker-compose.yml` under the `backup` service.

## Roadmap

- [ ] Official WhatsApp Cloud API adapter (for businesses with green
      tick needs)
- [ ] Bulk campaigns UI + rate-limit-safe sender
- [ ] Mobile money billing (Flooz, T-Money, Orange Money, MTN MoMo)
- [ ] Local Whisper + Coqui TTS containers (`profile: selfhost`)
- [ ] Agent hand-off routing rules (by intent, by hours)
- [ ] CRM lite (contact notes, tags, pipelines)
- [ ] SMS fallback when WhatsApp is unreachable

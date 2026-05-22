#!/usr/bin/env bash
# ProwasappAI — one-shot VPS installer.
# Run as root. Required env vars (passed via `VAR=val ... bash -c "$(curl ...)"`):
#   DATABASE_URL     Supabase (or any) Postgres connection string
#   JWT_SECRET       32+ bytes random secret
# Optional:
#   OPENAI_API_KEY   Enables the AI assistant
#   GROQ_API_KEY     Free voice transcription
#   PROWA_DOMAIN     Public hostname for Caddy (default: srv1305401.hstgr.cloud)
#   BRANCH           Git branch to deploy (default: claude/project-audit-saqHM)
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
DOMAIN="${PROWA_DOMAIN:-srv1305401.hstgr.cloud}"
BRANCH="${BRANCH:-claude/project-audit-saqHM}"
APP_DIR=/opt/prowasapp

log() { echo -e "\033[1;32m[deploy]\033[0m $*"; }

log "Installing prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || apt-get install -y -qq docker-compose-plugin

log "Cloning ProwasappAI ($BRANCH)..."
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone --branch "$BRANCH" --depth 1 https://github.com/gavoekoffi2/ProwasappAi.git "$APP_DIR"
fi

# Patch Caddyfile with the chosen domain.
sed -i "s/srv1305401\.hstgr\.cloud/$DOMAIN/" "$APP_DIR/deploy/Caddyfile"

log "Writing .env..."
cat > "$APP_DIR/deploy/.env" <<EOF
NODE_ENV=production
PORT=4000
APP_URL=https://prowasappai.netlify.app
CORS_ORIGINS=https://prowasappai.netlify.app
TRUST_PROXY=true
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
AUTH_RATE_LIMIT_PER_MIN=20
LLM_PROVIDER=openai
OPENAI_API_KEY=${OPENAI_API_KEY:-}
OPENAI_BASE_URL=https://api.openai.com/v1
GITHUB_TOKEN=${GITHUB_TOKEN:-}
GITHUB_MODELS_BASE_URL=https://models.github.ai/inference
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=600
AI_CONTEXT_TURNS=10
AI_RAG_TOP_K=4
AI_CONFIDENCE_THRESHOLD=0.55
STT_PROVIDER=openai
STT_MODEL=whisper-1
GROQ_API_KEY=${GROQ_API_KEY:-}
TTS_PROVIDER=none
TTS_MODEL=tts-1
TTS_VOICE=alloy
ELEVENLABS_API_KEY=
WA_SESSIONS_DIR=/app/wa_sessions
BILLING_PROVIDER=manual
PLAN_STARTER_MSG_LIMIT=1000
PLAN_PRO_MSG_LIMIT=10000
PLAN_BUSINESS_MSG_LIMIT=50000
UPLOAD_MAX_MB=20
EOF
chmod 600 "$APP_DIR/deploy/.env"

log "Building & starting stack (~3 min on first run)..."
cd "$APP_DIR/deploy"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

log "Waiting for backend..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    log "Backend healthy."
    break
  fi
  sleep 3
done

log ""
log "Done."
log "  Local check:  curl http://localhost:4000/health"
log "  Public URL:   https://$DOMAIN/health   (Caddy gets a Let's Encrypt cert on first hit)"
log "  Logs:         docker compose -f $APP_DIR/deploy/docker-compose.prod.yml logs -f backend"

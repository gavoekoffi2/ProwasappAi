#!/usr/bin/env bash
# One-shot deploy script for the ProwasappAI backend on a Hostinger VPS.
# Run as root.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/gavoekoffi2/ProwasappAi.git}"
BRANCH="${BRANCH:-claude/project-audit-saqHM}"
APP_DIR="/opt/prowasapp"

log() { echo -e "\033[1;32m[deploy]\033[0m $*"; }

log "Installing dependencies (docker, git, openssl)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git openssl ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  log "Installing docker-compose-plugin..."
  apt-get install -y -qq docker-compose-plugin
fi

log "Cloning repo into $APP_DIR..."
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR/deploy"

if [[ ! -f .env ]]; then
  log "Creating .env from .env.example — fill in DATABASE_URL and JWT_SECRET if not already set."
  cp .env.example .env
fi

log "Building & starting stack (this takes ~3 min on first run)..."
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

log "Waiting for backend to become healthy..."
for i in {1..30}; do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    log "Backend is up locally."
    break
  fi
  sleep 3
done

log "Done. Public URL: https://srv1305401.hstgr.cloud"
log "Caddy will obtain a Let's Encrypt cert on first HTTPS request."
log ""
log "Check logs with:  docker compose -f $APP_DIR/deploy/docker-compose.prod.yml logs -f backend"

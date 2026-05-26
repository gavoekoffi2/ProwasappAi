FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --omit=optional

FROM deps AS build
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# curl is used by the Docker HEALTHCHECK below.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates ffmpeg tini curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Drop privileges. mkdir+chown so the non-root user can persist Baileys
# auth state, uploads and tmp files at runtime.
RUN useradd --create-home --uid 1001 --shell /usr/sbin/nologin app \
    && mkdir -p /app/wa_sessions /app/uploads /app/tmp \
    && chown -R app:app /app
USER app

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -fsS http://localhost:4000/health/db || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "run", "start:migrate"]

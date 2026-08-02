# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Skip Puppeteer's Chrome download during npm ci — we use system Chromium at runtime
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Server deps
COPY package*.json ./
RUN npm ci

# Client deps + build
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY . .
RUN cd client && npm run build

RUN npm prune --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install Chromium + required libs for Puppeteer on Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto

ENV NODE_ENV=production \
    PORT=3005 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/server        ./server
COPY --from=builder /app/client/build  ./client/build
COPY --from=builder /app/package.json  ./package.json

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3005/api/health || exit 1

CMD ["node", "server/index.js"]

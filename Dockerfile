# ===== NEXUS Sim v2 — Multi-stage Dockerfile =====
# Optimized for minimal image size with Bun runtime

# ---- Stage 1: Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lockb* package-lock.json* yarn.lock* ./
RUN \
  if [ -f bun.lockb ]; then bun install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm install; \
  fi

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx next build

# Copy standalone output + static assets + public
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

# ---- Stage 3: Production ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nexus

# Copy built app
COPY --from=builder --chown=nexus:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nexus:nodejs /app/.next/standalone/.next ./.next
COPY --from=builder --chown=nexus:nodejs /app/prisma ./prisma

# Create data directories
RUN mkdir -p /app/data /app/.chroma-data && \
    chown nexus:nodejs /app/data /app/.chroma-data

USER nexus

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]

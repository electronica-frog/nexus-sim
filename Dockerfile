# NEXUS Sim v2 — Dockerfile
# Multi-stage build for minimal image size
# Includes: Next.js app + Python ChromaDB + ONNX models

# ===== Stage 1: Dependencies =====
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --omit=dev && npm cache clean --force

# ===== Stage 2: Python + ChromaDB =====
FROM python:3.12-slim AS python-deps

RUN pip install --no-cache-dir chromadb==1.5.9

# Pre-download ONNX model (all-MiniLM-L6-v2)
RUN python -c "import chromadb; c=chromadb.PersistentClient('/tmp/.chroma-preload'); c.get_or_create_collection('preload', metadata={'hnsw:space':'cosine'})" && \
    cp -r /root/.cache/chroma /opt/chroma-cache || true

# ===== Stage 3: Build =====
FROM node:20-slim AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npx prisma generate
RUN npm run build

# ===== Stage 4: Production =====
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies only
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/embed.py ./embed.py
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/watchdog.sh ./watchdog.sh
COPY --from=builder /app/db ./db

# Python + ChromaDB
COPY --from=python-deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=python-deps /usr/local/bin/python3* /usr/local/bin/
COPY --from=python-deps /opt/chroma-cache /opt/chroma-cache

# Pre-create chroma data directory
RUN mkdir -p /app/.chroma-data && chmod 777 /app/.chroma-data

# Environment
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/db/custom.db
ENV CHROMA_DATA_DIR=/app/.chroma-data
ENV PYTHON_PATH=/usr/local/bin/python3
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# Start with watchdog for process persistence
RUN chmod +x /app/watchdog.sh
CMD ["bash", "/app/watchdog.sh"]

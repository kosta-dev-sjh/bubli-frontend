# ============================================================
# Stage 1: Builder
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* 변수는 빌드 시 번들에 포함되므로 ARG로 주입
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_APP_BASE_URL
ARG NEXT_PUBLIC_TAURI_APP_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_APP_BASE_URL=$NEXT_PUBLIC_APP_BASE_URL \
    NEXT_PUBLIC_TAURI_APP_URL=$NEXT_PUBLIC_TAURI_APP_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================================
# Stage 2: Runner
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# next.config.ts output: 'standalone' 빌드 결과물만 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]

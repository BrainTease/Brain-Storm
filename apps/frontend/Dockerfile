# syntax=docker/dockerfile:1.7
# ────────────────────────────────────────────────────────────────────────────
# Stage 1: deps — install only production-relevant node_modules
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace manifests
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/types/package*.json ./packages/types/

RUN npm ci --workspace=apps/frontend --workspace=packages/types --ignore-scripts

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: builder — compile Next.js with standalone output
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules 2>/dev/null || true

COPY packages/types ./packages/types
COPY apps/frontend ./apps/frontend
COPY tsconfig.json ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for runtime env vars injected at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STELLAR_NETWORK=testnet
ARG NEXT_PUBLIC_SENTRY_DSN

RUN npm run build --workspace=apps/frontend

# ────────────────────────────────────────────────────────────────────────────
# Stage 3: runner — minimal production image (~250 MB)
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Port the app listens on
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone bundle produced by next build (output: 'standalone')
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static      ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public            ./apps/frontend/public

USER nextjs

EXPOSE 3001

# Lightweight health-check using Node's built-in http module (no extra deps)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get({host:'localhost',port:3001,path:'/api/health'},r=>{process.exit(r.statusCode===200?0:1)})" \
      || exit 1

CMD ["node", "apps/frontend/server.js"]

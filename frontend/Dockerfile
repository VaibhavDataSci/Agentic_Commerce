# ──────────────────────────────────────────────────────────────
#  Frontend Dockerfile — Agentic Commerce
#  Multi-stage: Node build → Nginx production serve
# ──────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY . .

# Build args for environment variables baked at build time
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_RAZORPAY_KEY_ID=placeholder
ARG VITE_APP_ENV=production

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_APP_ENV=$VITE_APP_ENV

RUN npm run build


# ── Stage 2: serve with Nginx ─────────────────────────────────
FROM nginx:1.27-alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

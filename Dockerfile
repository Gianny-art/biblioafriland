# ============================================================================
# Dockerfile — Bibliothèque numérique Afriland First Bank
# Multi-stage : build optimisé + image runtime légère (Nginx)
# ============================================================================

# ---------- Stage 1 : dépendances ----------
FROM oven/bun:1.1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ---------- Stage 2 : build production ----------
FROM oven/bun:1.1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables publiques injectées au build (préfixe VITE_)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN bun run build

# ---------- Stage 3 : runtime Nginx ----------
FROM nginx:1.27-alpine AS runtime

# Sécurité : utilisateur non-root
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app

# Configuration Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Artefact statique
COPY --from=builder /app/.output/public /usr/share/nginx/html

# Permissions
RUN chown -R app:app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown app:app /var/run/nginx.pid

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]

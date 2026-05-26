# ============================================================================
# Dockerfile — Bibliothèque numérique Afriland First Bank
# Multi-stage : build optimisé + image runtime légère (Nginx)
# ============================================================================

# ---------- Stage 1 : dépendances ----------
FROM oven/bun:latest AS deps

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install

# ---------- Stage 2 : build production ----------
FROM oven/bun:latest AS builder

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

# Mode CI pour éviter les watchers/boucles TanStack dans Docker
ENV CI=true

RUN bun run build

# ---------- Stage 3 : runtime Nginx ----------
FROM nginx:1.27-alpine AS runtime

# Sécurité : utilisateur non-root
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app

# Configuration Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Artefact frontend Vite/TanStack
COPY --from=builder /app/dist/client /usr/share/nginx/html

# Permissions & création des répertoires Nginx
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && \
    chmod -R 777 /var/cache/nginx /var/log/nginx /var/run && \
    chown -R app:app /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run && \
    touch /var/run/nginx.pid && \
    chmod 777 /var/run/nginx.pid && \
    chown app:app /var/run/nginx.pid

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
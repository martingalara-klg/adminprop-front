# Dockerfile — build de producción servido por Caddy con proxy /v1
#
# Referencias:
# - Issue #43 — mismo origen front/API en Railway (cookies SameSite=Lax de
#   la decisión #43 del SDD no viajan entre subdominios de Railway; nota
#   agregada por adminprop-back#90 en sdd_04 §2).
# - vite.config.ts — el modo relativo (`VITE_API_BASE_URL=/v1`) ya está
#   documentado ahí para server/preview de Vite; esta imagen aplica el mismo
#   principio al build de producción.
# - src/api/http-client.ts línea 31 — `API_BASE` lee `VITE_API_BASE_URL`
#   con fallback a `http://localhost:8000/v1`; en esta imagen se fija en
#   build time a `/v1` (relativo) para que el bundle pegue contra el proxy
#   de Caddy, no contra un host absoluto.
# - Caddyfile (este repo) — sirve `dist/` con fallback SPA y reenvía
#   `/v1/*` al upstream de la API vía `{$API_UPSTREAM}`.
#
# Uso local — ver docs/runbooks/RUNBOOK-LOCAL-002-frontend.md §11.

# ─── Etapa 1: build de Vite ──────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Dependencias primero (cache de capas de Docker).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Relativo, no absoluto: el bundle debe pegarle al mismo origen (Caddy
# reenvía /v1/* al upstream real) — ver nota arriba y vite.config.ts.
ENV VITE_API_BASE_URL=/v1

RUN npm run build

# ─── Etapa 2: Caddy sirviendo el estático + proxy /v1 ────────────────────────
FROM caddy:2-alpine

COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# Railway inyecta PORT en runtime — el Caddyfile lo lee vía {$PORT:80}
# (default 80 para uso local sin la variable seteada).

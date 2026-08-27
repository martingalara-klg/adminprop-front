# RUNBOOK-LOCAL-002 — Ambiente local frontend

> Objetivo: frontend de AdminProp corriendo localmente en **<10 minutos** desde una máquina limpia.

Referencias:
- Stack frontend: [`CLAUDE.md`](../../CLAUDE.md) §3
- Backend en local: [RUNBOOK-LOCAL-001](../../../adminprop-back/docs/runbooks/RUNBOOK-LOCAL-001-backend.md)

> El repo de frontend aún **no tiene código de aplicación** — solo `docs/`. Los pasos asumen que ya existe la estructura de app única Vite descrita en [`CLAUDE.md`](../../CLAUDE.md) §9. Adaptarlos si la estructura cambió.

> **Sin CD todavía:** el merge a `develop` solo corre CI (lint, typecheck, tests, build de validación). El deploy se incorpora cuando exista infra.

---

## 1. Prerequisitos

```bash
node --version            # >= 20.0 (Vite 5 requiere)
npm --version             # >= 10.0 (o pnpm >= 8.0 si se prefiere)
git --version
gh --version               # GitHub CLI
```

Si falta:
- Node 20+: https://nodejs.org/ o `nvm install 20 && nvm use 20`.
- pnpm (opcional, alternativa a npm): `corepack enable && corepack prepare pnpm@latest --activate`.

---

## 2. Primera vez — setup completo

### 2.1 Clonar el repo

```bash
git clone https://github.com/martingalara-klg/adminprop-front.git
cd adminprop-front
git checkout develop
```

### 2.2 Tener el backend corriendo en local

El frontend asume que el backend está en `http://localhost:8000`. Setup en [RUNBOOK-LOCAL-001](../../../adminprop-back/docs/runbooks/RUNBOOK-LOCAL-001-backend.md).

Verificar:

```bash
curl http://localhost:8000/health/liveness
# {"status":"ok"}
```

### 2.3 Copiar variables de entorno

El frontend lee variables `VITE_*` en **build time** (Vite dev server las usa por archivo `.env.local`):

```bash
cp .env.example .env.local
# editar .env.local con valores locales
```

`.env.local` (template):

```bash
# .env.local — adminprop-front
# Copiar de .env.example y completar.

# Backend local (RUNBOOK-LOCAL-001 lo levanta en :8000)
VITE_API_BASE_URL=http://localhost:8000/v1

# Domain config — en local usamos localhost
VITE_APP_DOMAIN=localhost:5173
<!-- dominio provisorio hasta definir infra -->

# i18n
VITE_DEFAULT_LOCALE=es-AR
VITE_SUPPORTED_LOCALES=es-AR,en-US

# Sentry — vacío en local para no enviar eventos
VITE_SENTRY_DSN=
VITE_SENTRY_ENV=local
VITE_APP_VERSION=local-dev
```

`.env.local` **NO se commitea** (está en `.gitignore`).

### 2.4 Instalar dependencias

```bash
npm install
# o, si el proyecto adopta pnpm: pnpm install --frozen-lockfile
```

Una única app Vite (`src/`) — no hay workspaces ni paquetes separados que instalar (decisión default del diseño §5: sin monorepo de builds múltiples).

### 2.5 Levantar el dev server

La app corre en el puerto **5173** (Vite default), incluyendo las rutas `/superadmin/*` (protegidas por `is_super_admin`, no requieren un puerto ni build separado).

```bash
npm run dev
```

### 2.6 Acceder a la UI

| URL | Qué es |
|---|---|
| http://localhost:5173 | App principal (organización: owner/admin/maintenance) |
| http://localhost:5173/superadmin | Rutas de Super Admin (misma app, protegidas por `is_super_admin`) |
| http://localhost:8000/docs | OpenAPI del backend local (FastAPI Swagger) |

### 2.7 Correr la suite de tests

```bash
# Unit + integration (Vitest)
npm test

# E2E (Playwright) -- ver §2.7.1, requiere el backend + worker + seed
npm run e2e

# Lint + typecheck
npm run lint
npm run typecheck
```

#### 2.7.1 E2E (Playwright) — issue #16

Los 4 E2E críticos (`tests/e2e/login.spec.ts`, `contracts.spec.ts`,
`payments.spec.ts`, `settlements.spec.ts`) corren contra un backend real
(sin mocks) — necesitan **Postgres + Redis + API + `documents_worker`**
levantados y datos sembrados. Tres pozos conocidos, ya resueltos acá:

1. **Sesión real, sin bypass**: el login usa cookies HttpOnly reales del
   backend (`src/api/http-client.ts`, `withCredentials: true`). El
   backend no tiene middleware CORS — `vite.config.ts` define un proxy
   (`server.proxy`/`preview.proxy`: `/v1` → `http://localhost:8000`) para
   que el browser vea todo como same-origin. Con esto, `npm run dev`
   (VITE_API_BASE_URL absoluto de `.env.local`) sigue funcionando igual
   que antes; para E2E, usar `VITE_API_BASE_URL=/v1` (relativo) al
   buildear/previsualizar (ver paso 3 abajo).
2. **`documents_worker` (Celery)**: sin él, el wizard de liquidación se
   queda en `processing` para siempre. Levantarlo con
   `adminprop-back`: `make up-workers` (o `docker compose -f
   docker/docker-compose.yml --profile workers up`) — trae también
   `notification_worker`/`beat`, que no hacen falta para estos E2E pero
   no molestan.
3. **Datos sembrados directo a la DB**: la activación de cuentas reales
   pasa por invitación por email (inviable en E2E/CI). `tests/e2e/seed/seed.py`
   siembra directo a Postgres (organización activa, usuarios owner/admin
   con password conocida — bcrypt cost 12 —, roles/permisos idénticos a
   `provisioning.py`, y los fixtures de propiedad/persona/contrato/
   rent_period/concepto recurrente que cada spec necesita). Es
   **idempotente**: correrlo varias veces sobre la misma base no duplica
   filas ni rompe. Credenciales sembradas: ver
   `tests/e2e/support/seed-data.ts`.

Pasos, con `adminprop-back` corriendo en local (`make up && make up-workers && make migrate`):

```bash
# 1. Backend + workers arriba (desde adminprop-back)
cd ../adminprop-back
make up
make up-workers
make migrate

# 2. Sembrar datos E2E (desde adminprop-front) -- requiere bcrypt +
#    psycopg2-binary en el Python que uses (ya están en el venv de
#    adminprop-back si lo tenés instalado: `cd ../adminprop-back &&
#    .venv/Scripts/python -m pip show bcrypt psycopg2-binary`; si no,
#    `pip install bcrypt psycopg2-binary` standalone alcanza).
cd ../adminprop-front
npm run e2e:seed
# equivalente: SEED_DATABASE_URL=postgresql://adminprop:adminprop@localhost:5432/adminprop python tests/e2e/seed/seed.py

# 3. Build + preview con API relativa (mismo origen vía el proxy de vite.config.ts)
VITE_API_BASE_URL=/v1 npm run build
npm run preview -- --port 5173 &

# 4. Correr los E2E
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run e2e

# 5. Bajar el preview cuando termines
kill %1
```

CI (`.github/workflows/ci.yml`, job `e2e-tests`) hace lo mismo de forma
automática en cada PR: clona `adminprop-back`, migra, levanta la API +
`documents_worker`, siembra, buildea con `VITE_API_BASE_URL=/v1` y corre
Playwright contra el preview.

---

## 3. Simulación del multi-tenant en local

Decisión `CLAUDE.md` §4: **single domain**. No hay subdominio por organización en local ni en el resto de ambientes.

Para probar con múltiples orgs en local:
- Crear N organizaciones vía `/superadmin/organizations` (con un usuario super-admin sembrado en el backend local).
- Invitar un owner por org.
- Para cambiar de org, hacer logout + login con un usuario que pertenece a otra org.

**No hace falta** modificar `/etc/hosts` ni proxy reverso. El JWT trae `org_id` y el backend lo deriva.

---

## 4. Generar tipos OpenAPI desde el backend local

El frontend consume tipos **generados desde el OpenAPI del backend local** (`CLAUDE.md` §3 + skill `api-client.md`):

```bash
# Backend debe estar corriendo en :8000
npm run gen-api-types
# script package.json: openapi-typescript http://localhost:8000/openapi.json -o src/api/generated/types.ts
```

Hacer esto **cada vez** que el backend agrega/cambia un endpoint en `sdd_03`.

---

## 5. Sesiones subsecuentes (~30 seg)

```bash
git checkout develop
git pull origin develop
npm install         # solo si cambió package-lock.json
npm run dev
```

---

## 6. Storybook

```bash
npm run storybook
# http://localhost:6006
```

Para componentes compartidos de `src/shared/components/`.

---

## 7. Troubleshooting

| Error | Causa | Solución |
|---|---|---|
| `ECONNREFUSED localhost:8000` en las llamadas API | Backend no está corriendo | `cd ../adminprop-back && make up` |
| `CORS error` en browser console | Backend no incluye el origin de la app local en `CORS_ORIGINS` | Editar `.env` del backend con `CORS_ORIGINS=http://localhost:5173` y reiniciar (`make down && make up`) |
| `401 UNAUTHORIZED` en `/auth/refresh` | El interceptor de refresh no está enviando cookies | Verificar que Axios tiene `withCredentials: true` (debería ser por default en `src/api/http-client.ts`) |
| Cookies no llegan al backend | Browser bloquea cookies cross-site con `Secure` en HTTP | El backend setea `Secure: false` cuando `APP_ENV=development` para permitir cookies en HTTP local |
| `Cannot find module '@/...'` | Alias de TypeScript/Vite mal configurado | Verificar `tsconfig.json` `paths` y `vite.config.ts` `resolve.alias` |
| `Build error: VITE_*` undefined | Falta `.env.local` o la variable no empieza con `VITE_` | Verificar §2.3 |
| TanStack Query: data nunca refresca | `staleTime` muy alto | Verificar config en `src/main.tsx`; por default queries son `staleTime: 0` |
| Storybook no levanta | Dependencias desactualizadas | `npm install --force` y luego `npm run storybook` |

---

## 8. Cuándo actualizar este runbook

| Si en una sesión... | Actualizar |
|---|---|
| Cambia la estructura del repo (nuevos módulos top-level) | §9 de `CLAUDE.md` + §2 acá |
| Se agrega una variable `VITE_*` nueva | Plantilla en §2.3 + `.env.example` |
| Cambia el comando de generación de tipos OpenAPI | §4 |
| Aparece un error común no listado | §7 |

---

## 9. Conexión a un backend local con datos distintos

A veces querés probar el frontend contra otra instancia local del backend (por ejemplo, otra rama con datos sembrados distintos). Editar `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8001/v1
```

No hay ambientes remotos (`staging`/`production`) todavía — sin infra cloud, todo el trabajo se hace contra el backend local (ver nota "Sin CD todavía" al inicio del documento).

---

## 11. Imagen de producción (Docker + Caddy) — issue #43

Railway (y cualquier ambiente que despliegue el front como contenedor)
sirve el build estático **y** reenvía `/v1/*` a la API por el mismo
origen — necesario porque las cookies de sesión del backend son
`SameSite=Lax` (decisión #43 del SDD; nota de despliegue agregada por
adminprop-back#90 en `sdd_04` §2) y no viajan entre subdominios distintos
de Railway.

### 11.1 Qué hace la imagen

- **Etapa 1** (`node:20-alpine`): `npm ci && npm run build` con
  `VITE_API_BASE_URL=/v1` (relativo — el bundle pega contra el proxy, no
  contra un host absoluto).
- **Etapa 2** (`caddy:2-alpine`): sirve `dist/` con fallback SPA
  (`try_files {path} /index.html`) y reenvía `/v1/*` al upstream de la API
  (`reverse_proxy /v1/* {$API_UPSTREAM}`, **sin default hardcodeado a
  producción** — en local cae en `http://localhost:8000`).
- Caddy escucha en `{$PORT:80}` (Railway inyecta `PORT`; local usa 80 por
  default salvo que se pase `-e PORT=...`).
- El `Caddyfile` envuelve `reverse_proxy` + `try_files` + `file_server` en
  un bloque `route { ... }` para forzar orden de ejecución por posición en
  el archivo — el orden default de directivas de Caddy corre
  `try_files`/`file_server` **antes** que `reverse_proxy`, lo que
  reescribía cualquier request a `/v1/*` hacia `/index.html` antes de que
  el proxy la viera (reproducido localmente: `POST /v1/auth/login`
  devolvía `405 Method Not Allowed` de `file_server` en vez de llegar a la
  API). Con `route`, `reverse_proxy` corre primero y es terminal para lo
  que matchea `/v1/*`.

### 11.2 Build

```bash
docker build -t adminprop-front:local .
```

### 11.3 Correr contra el backend del compose de `adminprop-back`

El backend local (`adminprop-back/docker/docker-compose.yml`, `make up`)
crea la red `adminprop-back_default` con el servicio API accesible como
`adminprop-back-api-1` (nombre del contenedor) puerto `8000`.

```bash
# 1. Backend arriba (desde adminprop-back)
cd ../adminprop-back
make up

# 2. Front en la misma red del compose del back
cd ../adminprop-front
docker run -d --name adminprop-front-local \
  --network adminprop-back_default \
  -e API_UPSTREAM=http://adminprop-back-api-1:8000 \
  -e PORT=8080 \
  -p 18080:8080 \
  adminprop-front:local
```

### 11.4 Verificar

```bash
# (a) SPA index
curl -i http://localhost:18080/

# (b) fallback SPA en ruta profunda (debe devolver el mismo index.html)
curl -i http://localhost:18080/contracts/algo/profundo

# (c) el proxy atraviesa hasta la API real (Set-Cookie visible en login OK)
curl -i -X POST http://localhost:18080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>"}'
```

En `(c)`, un login exitoso responde `Set-Cookie: access_token=...;
HttpOnly; SameSite=lax; Secure` y `Set-Cookie: refresh_token=...` —
confirma mismo-origen: el browser los acepta porque `access_token`/
`refresh_token` vienen del mismo host que sirvió el HTML.

### 11.5 Bajar todo

```bash
docker rm -f adminprop-front-local
cd ../adminprop-back && make down
```

### 11.6 Variables relevantes

| Variable | Dónde se usa | Default |
|---|---|---|
| `API_UPSTREAM` | `Caddyfile` — upstream del reverse proxy `/v1/*` | `http://localhost:8000` (solo dev; en Railway se pasa el host interno real del servicio API) |
| `PORT` | `Caddyfile` — puerto de escucha de Caddy | `80` (Railway lo inyecta en runtime) |
| `VITE_API_BASE_URL` | Build de Vite (etapa 1 del `Dockerfile`) | Fijo en `/v1` dentro del `Dockerfile` — no se pasa en runtime, es build-time |

### 11.7 CI

`.github/workflows/ci.yml` job `docker-build` corre `docker build .` en
cada PR/push a `develop` — solo valida que la imagen buildea (no la
corre ni verifica contra un backend real; esa verificación es manual,
descripta arriba).

---

## 12. Próximos pasos

1. Leer [`docs/prompts/session-start.md`](../prompts/session-start.md) para iniciar la primera sesión.
2. Leer los SDDs del módulo en el que vas a trabajar (`docs/sdd/`).
3. Leer los skills relevantes (`docs/skills/`).

# AdminProp Frontend — CLAUDE.md

## 1. Proyecto

- **Nombre:** AdminProp — UI web de gestión de alquileres para administradoras de propiedades.
- **Tipo:** SPA React 18 + Vite + TypeScript. **Una única app** (decisión #107): las rutas `/superadmin/*` viven en la misma app, protegidas por `is_super_admin`. Responsive, español (es-AR).
- **Usuarios:** owner (corredor), admin (secretaria), maintenance (encargado de reparaciones — solo ve mantenimiento).

> **Este es el repositorio de FRONTEND.**
> El backend es **`adminprop-back`** (FastAPI + PostgreSQL + Celery). Toda la lógica de negocio vive allá; este repo consume la API de `sdd_03_api_contracts` **tal cual está especificada**.

---

## 2. Fuente de verdad

**Antes de implementar cualquier flujo de UI, leer el SDD del módulo.** `docs/sdd/` es una **copia sincronizada** desde `adminprop-back` (PR automático de CI) — nunca editar SDDs acá; toda edición va en el back.

SDDs de referencia primaria para el front: `_index.md` (mapa + decisiones), `sdd_01_prd.md` (UC-XX), `sdd_03_api_contracts.md` (**vinculante**), `sdd_04_nonfunctional.md` §2 (seguridad cliente), las 8 specs de módulo (cada flujo UI tiene una, con sus CA-XX) y `spec_notificaciones.md` (panel in-app).

### Regla de oro

**El frontend nunca define contratos: los consume.** Si la API real no coincide con `sdd_03` (campo faltante/extra, shape distinto, código de error no documentado) → **reportar** (endpoint, campo, qué dice el SDD vs qué devuelve, si bloquea) y esperar instrucción. Nunca adaptar el front para compensar.

---

## 3. Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 + TypeScript + Vite · shadcn/ui + Tailwind |
| Routing | React Router (lazy loading por módulo) |
| Estado servidor | TanStack Query v5 (staleTime alineado a los TTL de `sdd_04` §1.4) |
| Estado cliente | Zustand (solo UI: filtros, preferencias — nunca datos del servidor) |
| HTTP | Axios `withCredentials: true` + interceptor de refresh (401 → `/auth/refresh` → retry → si falla, `/login`) |
| Forms | React Hook Form + Zod (schemas alineados a las RN-XX de `sdd_02`) |
| Tipos API | **Generados desde el OpenAPI del backend local** (`src/api/generated/`) — nunca redeclarar a mano |
| i18n | Español es-AR único en MVP; formatos DD/MM/AAAA, miles `.` decimal `,` |
| Tests | Vitest + React Testing Library + Playwright (E2E); naming por CA-XX |

---

## 4. Reglas duras del cliente

- **JWT en cookies HttpOnly** — el cliente jamás lee ni guarda tokens; **nunca `localStorage`/`sessionStorage`** para credenciales.
- **`organization_id` no existe en el front:** nunca se envía ni se guarda; el backend lo deriva del JWT. Multi-org = logout + login (#49).
- **Permisos:** hook `usePermission()` + `<RequirePermission>` sobre los permisos atómicos del JWT. La UI oculta por UX; el backend enforza igual. `maintenance` solo ve el módulo de mantenimiento.
- **Errores:** discriminar SIEMPRE por `error.code` (catálogo cerrado de `sdd_03`); mensajes es-AR del mapa central; los textos anti-enumeration de `sdd_04` §2.2a son literales.
- **Async 202:** pantallas de "procesando" con polling (liquidaciones); estados `pending|processing|completed|with_errors|failed`.
- **Descargas** (Excel/PDF de liquidaciones): fetch + blob, nunca `window.open`.
- **Estados obligatorios en cada flujo:** loading / error / empty / expired (token) / read-only. Implementar TODOS los flujos alternativos del SDD, no solo el happy path.
- **Flujos clave especificados:** wizard de liquidación mensual (`spec_module_05` §Wizard: select_period → review → exchange_rate → confirmation), bandeja de ajustes pendientes con ingreso del %, panel de cobranzas con mora sugerida y perdón, ciclo de mantenimiento con fotos.

---

## 5. Comportamiento esperado de Claude Code — Frontend

**Siempre:** leer la spec del módulo antes de cada pantalla; tipos desde OpenAPI; TanStack Query para todo dato del servidor; nombrar tests con CA-XX; propagar `X-Request-Id` a Sentry breadcrumbs.

**Nunca sin preguntar:** cambiar shapes de requests/responses; agregar campos a formularios que el SDD no especifica; implementar lógica de negocio en el cliente (cálculo de mora, comisiones, conversiones — eso es del backend); asumir comportamientos no documentados; features post-MVP.

**Ante divergencia con la API:** reportar y esperar (ver Regla de oro).

---

## 6. Estructura del repositorio

```
adminprop-front/
├── docs/sdd/                       ← copia sincronizada (NO editar acá)
├── docs/skills/                    ← patrones front (leer según tipo de tarea)
├── docs/prompts/session-start.md   ← comando de sesión autónoma
├── docs/runbooks/RUNBOOK-LOCAL-002-frontend.md
├── src/
│   ├── api/                        ← http-client, generated/ (OpenAPI), <recurso>.api.ts
│   ├── modules/                    ← auth, properties, people, contracts, payments,
│   │                                 settlements, maintenance, admin, notifications, account
│   │   └── <módulo>/{pages,components,hooks,__tests__}/
│   ├── superadmin/                 ← rutas /superadmin/* (misma app, guard is_super_admin)
│   ├── shared/                     ← componentes UI, hooks, errores, i18n, theme
│   ├── App.tsx · main.tsx · routes.tsx
├── tests/e2e/                      ← Playwright
├── package.json · vite.config.ts · tailwind.config.ts
└── .github/workflows/ci.yml
```

## 7. Pendientes

`PROJECT_NUMBER` del session-start (bootstrap) · scaffolding Vite (primer issue front del roadmap) · primera copia de `docs/sdd/` (llega con el primer sync desde el back) · diseño visual/tokens del theme (definir al arrancar la UI).

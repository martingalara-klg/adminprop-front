# PROMPT DE SESIÓN — ADMINPROP FRONTEND

Usar al inicio de cada sesión de implementación en `adminprop-front`.
Claude Code lee este archivo y opera autónomamente hasta tener un PR
listo en `In Progress` (el Project solo tiene Todo / In Progress / Done).

### Reglas de merge del proyecto

- **Todos los PRs van a `develop`** — siempre `--base develop`, sin excepciones.
- **El usuario mergea los PRs uno a uno** y marca cada tarea como done en el Project.
- **Cada sesión empieza desde `develop`** con `git pull origin develop` para incorporar los últimos merges del usuario antes de crear el branch de la nueva tarea.
- **No crear el branch desde otro feature branch**, aunque la tarea dependa de un PR aún sin mergear. El usuario maneja el orden de merge.

---

## VARIABLES DE SESIÓN (hardcoded — no editar)

```bash
REPO="adminprop-front"
ORG="martingalara-klg"
PROJECT_NUMBER=2   # AdminProp Frontend — confirmado en el bootstrap (2026-08-06) (paso 7 del diseño)

# Cachear IDs del Project una sola vez por sesión (gh project item-edit
# los requiere; calcularlos cada vez es ruido):
PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$ORG" --format json | jq -r .id)
STATUS_FIELD_ID=$(gh project field-list "$PROJECT_NUMBER" --owner "$ORG" --format json \
  | jq -r '.fields[] | select(.name == "Status") | .id')
status_option() {
  gh project field-list "$PROJECT_NUMBER" --owner "$ORG" --format json \
    | jq -r ".fields[] | select(.name == \"Status\") | .options[] | select(.name == \"$1\") | .id"
}
# El Project tiene tres estados: "Todo" / "In Progress" / "Done"
# (no existe "In Review" ni "Blocked" en el Project de este repo)
STATUS_IN_PROGRESS_ID=$(status_option "In Progress")
```

Nota: este proyecto es una **única app Vite** (sin monorepo de builds
múltiples, sin directorios de build separados por audiencia). No hay
variable `APP=` que elegir ni lógica de app target — las rutas
`/superadmin/*` viven en el mismo build, protegidas por `is_super_admin`.

---

## LECTURA OBLIGATORIA AL INICIO (en este orden)

1. `CLAUDE.md`
2. `docs/skills/git-workflow.md`
3. `docs/skills/github-project-workflow.md`
4. `docs/skills/code-review.md` (sólo §"Checklist por tipo de artefacto" para tener presente lo que el PR debe satisfacer)
5. **El SDD que la tarea declara** (lo extrae el comando de Fase 1.1). Recordar: `docs/sdd/` es copia sincronizada desde `adminprop-back`; el contenido es source-of-truth aunque viva en este repo.
6. **El skill frontend específico** según el tipo de tarea:
   - `UI_FLOW` (flujo end-to-end con varios estados) → `docs/skills/flow-implementation.md` + `docs/skills/module-structure.md` + `docs/skills/api-client.md` + `docs/skills/error-handling.md` + `docs/skills/state-management.md`
   - `AUTH` o `TENANT-AWARE` (login, MFA, roles) → además `docs/skills/tenant-context.md`
   - `API_INTEGRATION` (consumo de un endpoint nuevo) → `docs/skills/api-client.md` + `docs/skills/error-handling.md` + `docs/runbooks/RUNBOOK-LOCAL-002-frontend.md` §4 (generación de tipos OpenAPI)
   - `STATE` (filtros globales, wizard persistente, tema) → `docs/skills/state-management.md`
   - `UI_COMPONENT` (componente en `src/shared/components/`) → `docs/skills/module-structure.md`
   - `TEST` (suite nueva o ampliación) → `docs/skills/testing.md`

`docs/skills/testing.md` se aplica siempre en la Capa 4.

> Sin CD todavía: el merge a develop solo corre CI. El deploy se
> incorpora cuando exista infra.

---

## FASE 1 — SELECCIÓN DE TAREA

### 1.1 Estado actual del Project

```bash
# Issues disponibles para tomar
gh issue list --repo "$ORG/$REPO" --label "status:ready" \
  --json number,title,labels,body \
  | jq '.[] | {number, title, labels: [.labels[].name]}'

# Snapshot completo del Project agrupado por Status
gh project item-list "$PROJECT_NUMBER" --owner "$ORG" --format json \
  | jq '
    .items
    | group_by(.status)
    | map({status: .[0].status, items: map({number: .content.number, title: .content.title})})
  '
```

### 1.2 Reglas de selección (en orden)

1. Sólo issues con `status:ready` (los `status:blocked` no se tocan).
2. **Verificar el contrato del backend en `sdd_03`, no el deploy.** El frontend implementa contra el contrato vinculante de `sdd_03` (que ya está mergeado en este repo vía sync). Si el endpoint que el flujo necesita no está en `sdd_03` → es bloqueante tipo **A** (SDD incompleto). Si está en `sdd_03` pero el backend local aún no lo implementó, el frontend puede avanzar — la suite usa el tipo + mocks. La divergencia se valida al integrar con el backend local real (bloqueante tipo **C** si discrepa con `sdd_03`).
3. Priorizar por **fase del roadmap** (Fase 0 > Fase 1 > Fase 2 > …).
4. Dentro de la misma fase: el issue que **desbloquea más issues** (revisar `## Bloquea a` / `## Depende de` del body).
5. Desempate: complejidad **Baja > Media > Alta**.

### 1.3 Presentar plan y esperar confirmación

Única pausa planificada. Salida exacta:

```
TAREA SELECCIONADA — FRONTEND
──────────────────────────────────────────────
Issue:       #<N> — <título>
Fase:        <fase>
Tipo:        <UI_FLOW | AUTH | API_INTEGRATION | STATE | UI_COMPONENT | TEST>
SDD:         docs/sdd/<ruta>.md §<sección, sección>
Skills:      docs/skills/<skill-1>.md, docs/skills/<skill-2>.md
Complejidad: <Baja | Media | Alta>

ENDPOINTS DE BACKEND CONSUMIDOS (contrato sdd_03)
──────────────────────────────────────────────────
- <MÉTODO> /v1/<path> — sdd_03 §<sección>
Estado del contrato: <especificado en sdd_03 ✓ | ambiguo ⚠>

DESBLOQUEA AL CERRAR
──────────────────────
- #<N> <título>

PLAN POR CAPAS
───────────────
Capa 1: <tipos generados + cliente API en src/api/>
Capa 2: <Zod schemas + hooks (TanStack Query / mutations)>
Capa 3: <pages + components + estados (Zustand UI / RHF forms)>
Capa 4: <tests Vitest co-locados + Playwright si toca flujo crítico>

ESTADOS DEL FLUJO A IMPLEMENTAR (los 6 obligatorios)
──────────────────────────────────────────────────────
- [ ] idle
- [ ] loading
- [ ] success
- [ ] error (por error.code relevante del SDD)
- [ ] expired (si el flujo tiene token: invitación / reset / MFA)
- [ ] empty (si la pantalla puede no tener datos)

CASOS ALTERNATIVOS / error.code A CUBRIR (extraídos del SDD)
──────────────────────────────────────────────────────────────
- <ERROR_CODE>: <UX dedicada — page-level / inline / toast>
- ...

ARCHIVOS A CREAR / MODIFICAR
──────────────────────────────
- src/api/<módulo>.api.ts
- src/api/generated/  (si hay regeneración)
- src/modules/<módulo>/{pages,components,hooks,schemas,types,routes.tsx}/
- src/modules/<módulo>/__tests__/<feature>.spec.tsx
- tests/e2e/<módulo>/<flow>.spec.ts  (si UI_FLOW crítico)

CRITERIOS DE DONE (extraídos del issue)
────────────────────────────────────────
- [ ] CA-XX-01: <descripción>
- [ ] CA-XX-02: <descripción>

¿Algo a revisar antes de comenzar? Silencio = proceder.
```

⏸ **ÚNICA PAUSA PLANIFICADA.** Próxima pausa sólo ante bloqueante real (ver "Cuándo pausar").

---

## FASE 2 — INICIO EN GITHUB

```bash
ISSUE_NUMBER=<seleccionado en Fase 1>

# Leer issue completo
gh issue view "$ISSUE_NUMBER" --repo "$ORG/$REPO"

# SLUG: 3–5 palabras kebab-case derivadas del título del issue
SLUG="<slug-descriptivo>"

# Extraer el milestone del issue (se aplicará también al PR)
MILESTONE=$(gh issue view "$ISSUE_NUMBER" --repo "$ORG/$REPO" --json milestone --jq '.milestone.title')

# Obtener ID del item en el Project
ITEM_ID=$(gh project item-list "$PROJECT_NUMBER" --owner "$ORG" --format json \
  | jq -r --argjson n "$ISSUE_NUMBER" '.items[] | select(.content.number == $n) | .id')

# Branch SIEMPRE desde develop — nunca desde otro feature branch
git fetch origin
git checkout develop
git pull origin develop   # incorpora los merges que el usuario haya hecho
git checkout -b "feature/${ISSUE_NUMBER}-${SLUG}"

# Mover a "In Progress" en el Project
gh project item-edit \
  --project-id "$PROJECT_ID" \
  --id "$ITEM_ID" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$STATUS_IN_PROGRESS_ID"

# Labels disponibles en este repo: status:ready y status:blocked únicamente
# (no existen status:in-progress, status:in-review — no intentar agregarlos)

echo "✓ Branch: feature/${ISSUE_NUMBER}-${SLUG}"
echo "✓ Issue #$ISSUE_NUMBER → In Progress"
```

---

## FASE 3 — IMPLEMENTACIÓN

Implementar sin pausas salvo bloqueante real. Un commit por capa
completada y verificada. Convenciones de commit en `git-workflow.md`
(Conventional Commits + footer `Closes #N` + `Implements: CA-XX` + `Rule: RN-XX` si aplica).

### Capa 1 — Tipos + Cliente API

Aplica `docs/skills/api-client.md`.

- Los tipos del request/response vienen de `src/api/generated/` (pipeline OpenAPI del backend local). Si el endpoint es nuevo y aún no está en `generated/`, agregar el tipo manual en `src/api/types/` con `// TODO: regenerar al estar disponible en OpenAPI` y abrir issue para regenerar.
- Un archivo de cliente por módulo del SDD: `src/api/<módulo>.api.ts`. No clientes monolíticos.
- Usar el `httpClient` central (`src/api/http-client.ts`) con `withCredentials: true` (HttpOnly cookies). **Nunca** crear instancias Axios ad-hoc.
- Mantener la envoltura `{ data, meta }` del SDD; no aplanarla.
- Descargas de archivos: helper `downloadFile(url, filename)` (Fetch + Blob). **Prohibido** `window.open(url)` y `<a href={url}>` sin fetch.

```bash
git add src/api/
git commit -m "feat(api/<módulo>): add API client per sdd_03 §<sección>

<qué endpoint cubre — máx 3 líneas>

Closes #${ISSUE_NUMBER}"
```

### Capa 2 — Schemas Zod + Hooks (TanStack Query)

Aplica `docs/skills/flow-implementation.md` + `docs/skills/state-management.md`.

- **Server state SIEMPRE en TanStack Query**, nunca en Zustand. queryKey: `['<module>', '<sub>', ...filters]`. `staleTime` alineado con `sdd_04 §1.4`.
- **Mutations**: `useMutation` + `queryClient.invalidateQueries({ queryKey: ['<module>'] })`. Sin retry automático (mutations son `retry: 0`).
- **Forms**: React Hook Form + Zod (`@hookform/resolvers/zod`). El schema Zod valida **un subset** de las invariantes del backend (feedback inmediato), no replica RN-XX completas.
- **Polling de jobs async** (`settlement.status`, `payment_batch.status`, etc.): `refetchInterval` con stop condition (parar al llegar a `completed`/`failed`/etc.).
- **Optimistic updates**: SOLO en operaciones idempotentes y reversibles (ej: `notifications/:id/read`). Nunca en financieras (cobros, liquidaciones).

```bash
git add src/modules/<módulo>/{schemas,hooks,types}/
git commit -m "feat(<módulo>): add hooks + Zod schemas for <feature>

Implements: CA-XX-NN"
```

### Capa 3 — Pages + Components + Estado UI

Aplica `docs/skills/module-structure.md` + `docs/skills/flow-implementation.md` + `docs/skills/tenant-context.md` + `docs/skills/error-handling.md`.

Estructura canónica:

```
src/modules/<módulo>/
├── pages/             ← composición + routing; sin llamadas a API
├── components/        ← presentacionales; props in / events out
├── hooks/             ← (Capa 2)
├── schemas/           ← (Capa 2)
├── types/             ← (Capa 1) types locales (no API)
├── routes.tsx         ← lazy() + Suspense por módulo
└── __tests__/         ← (Capa 4)
```

Reglas no negociables:

- **Los 6 estados del flujo** tienen UI explícita: `idle`, `loading`, `success`, `error` (discriminado por `error.code`), `expired`, `empty`. Simplificar a "loading/success/error" no es aceptable.
- **Cada `error.code` del SDD** que el flujo puede ver tiene UX dedicada (page-level / inline / toast — ver `error-handling.md` §"Mapeo error.code → UX"). Nunca catch genérico.
- **Mensajes de seguridad literales del SDD** (anti-enumeration login, forgot-password, banners de pending_deletion). Vivir en `src/shared/i18n/messages/security.es-AR.ts`.
- **Permisos en UI**: `<RequirePermission permission="<perm>">` o `usePermission(<perm>)` — lee del array `permissions[]` del JWT. Nunca por `role_name`. El rol `maintenance` sólo ve órdenes de trabajo asignadas y sus cotizaciones; nunca contratos, cobranzas ni liquidaciones.
- **Tenant**: `organization` viene del JWT (`useSession()`). El cliente NO envía `organization_id` en ningún request. NO inferir tenant del subdominio (single-domain).
- **Switch de organización**: no existe endpoint. Si el usuario tiene multi-membresía, flujo aprobado es logout + login.
- **`/superadmin/*`**: vive en la misma app (sin build separada), protegido por `<RequireSuperAdmin>` que lee `is_super_admin` del JWT.
- **Code splitting**: cada módulo usa `lazy()` + `Suspense` en `routes.tsx`.

```bash
git add src/modules/<módulo>/{pages,components,routes.tsx}
git commit -m "feat(<módulo>): implement <feature> UI with all flow states

Implements: CA-XX-NN"
```

### Capa 4 — Tests

Aplica `docs/skills/testing.md`.

- **Vitest** (unit + integration de hooks/componentes): `src/modules/<módulo>/__tests__/<feature>.spec.tsx`.
- **Playwright** (E2E happy path + FA críticos): `tests/e2e/<módulo>/<flow>.spec.ts`. Sólo para flujos críticos: auth/MFA, alta de contrato, registro de cobro, orden de trabajo end-to-end.
- Nombre del test (Vitest):
  ```typescript
  describe('UC-XX — <título del flujo>', () => {
    it('CA-XX-NN: <descripción exacta del SDD>', ...)
  })
  ```
- **Cada CA-XX del issue** → un `it()` dedicado.
- **Cada `error.code` del SDD** relevante → un test que verifica que la UI muestra la UX dedicada.
- Verificar **mensajes de seguridad literales** (anti-enumeration login, forgot-password, etc.) con `toHaveTextContent('Credenciales incorrectas.')` exacto.
- Para descargas: verificar que se usa `fetch + blob`, no `window.open`.
- **Storybook** (si el PR introduce un componente reutilizable en `src/shared/components/`): incluir story con default + variantes principales.

```bash
git add src/modules/<módulo>/__tests__/ tests/e2e/ src/shared/components/**/*.stories.tsx
git commit -m "test(<módulo>): cover CA-XX-01 to CA-XX-N + flow states

Covers: CA-XX-01, CA-XX-02, ..., CA-XX-N"
```

---

## CUÁNDO PAUSAR

Sólo interrumpir ante bloqueantes reales. Para todo lo demás, decidir y
continuar usando el SDD como fuente de verdad.

```
⛔ BLOQUEANTE TIPO [A|B|C|D] — <título corto>
───────────────────────────────────────────────
Tipo:
  A — El SDD no especifica el comportamiento para un caso real
  B — Lo del SDD no es implementable con el stack del proyecto
       (React 18, Vite, TanStack Query, Zustand, RHF+Zod, shadcn/ui+Tailwind)
  C — El backend local diverge del contrato sdd_03 (response shape,
       status code, error.code, headers, comportamiento)
  D — Decisión de seguridad / datos del usuario no resuelta en el SDD

Contexto:  <dónde estaba implementando>
Problema:  <descripción precisa>
SDD dice:  <cita textual con ruta + sección, o "no especificado">
API real:  <sólo para tipo C: response observado>

Opciones:
  1. <opción A — implicaciones>
  2. <opción B — implicaciones>

Recomendación: Opción <N> — <razón técnica objetiva>

Necesito tu decisión para continuar.
```

**Regla especial Tipo C (divergencia backend):** NO adaptar el frontend
para compensar. Abrir issue en `adminprop-back` con label `sdd:divergence`
(ver `github-project-workflow.md` §"Manejo de divergencias"), mover el
issue actual de frontend a `status:blocked` con comentario linkeando al
issue de backend, y esperar resolución. Snippet:

```bash
gh issue create --repo "$ORG/adminprop-back" \
  --title "[SDD-DIVERGENCE] sdd_03 §<sección> — <título>" \
  --label "sdd:divergence" \
  --label "status:blocked" \
  --body "Detectado durante implementación de martingalara-klg/adminprop-front#${ISSUE_NUMBER}.
SDD dice: <cita>
API real: <observado>
Opciones: ..."
```

---

## FASE 4 — PULL REQUEST

### 4.1 Checklist pre-PR (silencioso — corregir antes de abrir)

- [ ] `npm test` (Vitest) en verde para el módulo afectado.
- [ ] `npm run e2e` (Playwright) en verde si el módulo es UI_FLOW crítico.
- [ ] `npm run lint` y `npm run typecheck` en verde.
- [ ] Cada CA-XX del issue tiene un test con el ID en el nombre.
- [ ] Los 6 estados del flujo (`idle`, `loading`, `success`, `error`, `expired`, `empty`) tienen UI dedicada.
- [ ] Cada `error.code` del SDD relevante al flujo tiene UX dedicada (no catch genérico).
- [ ] Los mensajes de seguridad usan el **texto exacto del SDD** (anti-enumeration, MFA, banners, recovery codes).
- [ ] Restricciones por rol usan `<RequirePermission>` / `usePermission` sobre `permissions[]`, no `role_name`. El rol `maintenance` no ve contratos, cobranzas ni liquidaciones.
- [ ] Server state vive en TanStack Query (no Zustand). UI state local en Zustand `persist` con namespace `adminprop:`.
- [ ] Forms usan React Hook Form + Zod; los schemas Zod son un subset de invariantes del backend (no replican lógica).
- [ ] Tipos de request/response vienen de `src/api/generated/` o están marcados `// TODO regenerar`.
- [ ] El cliente HTTP usa `withCredentials: true`; **ningún** token vive en `localStorage`/`sessionStorage`.
- [ ] El frontend **no** envía `organization_id` en body/path/query (excepto `/superadmin/*`).
- [ ] El frontend **no** infiere tenant del subdominio (single-domain).
- [ ] Descargas de archivos usan Fetch + Blob, no `window.open()`.
- [ ] Endpoints async (`202 Accepted`) tienen polling con stop condition o esperan notificación in-app.
- [ ] Cambios de ruta usan `lazy()` + `Suspense`.
- [ ] Si toca `src/shared/components/`: hay story de Storybook acompañando.
- [ ] No hay decisiones de diseño sin respaldo en el SDD.
- [ ] No hay código fuera del scope del issue.

### 4.1.1 Checklist operativo (silencioso — corregir antes de abrir)

- [ ] Si la tarea agrega una variable `VITE_*` nueva: actualizar `.env.example`.
- [ ] Si la tarea consume un endpoint nuevo del backend local: regenerar tipos OpenAPI (`docs/runbooks/RUNBOOK-LOCAL-002-frontend.md` §4) y commitearlos.
- [ ] Si la tarea agrega Storybook stories nuevas: verificar que `npm run storybook` compila localmente (`docs/runbooks/RUNBOOK-LOCAL-002-frontend.md` §6).

### 4.2 Push

```bash
# El branch ya nació de develop (Fase 2) — no se necesita rebase adicional
git push -u origin "feature/${ISSUE_NUMBER}-${SLUG}"
```

### 4.3 Crear el PR

```bash
gh pr create --repo "$ORG/$REPO" --base develop \
  --title "[#${ISSUE_NUMBER}] <título descriptivo>" \
  --assignee "@me" \
  --milestone "$MILESTONE" \
  --body "$(cat <<EOF
## Tarea
Closes #${ISSUE_NUMBER}

## SDD de referencia
- Documento: \`docs/sdd/<ruta>.md\`
- Secciones: <X.Y>, <X.Z>

## Endpoints de backend consumidos (contrato sdd_03)
- \`<MÉTODO>\` \`/v1/<path>\` — \`sdd_03\` §<sección>

## Criterios de aceptación implementados
- [x] CA-XX-01: <descripción exacta del SDD>
- [x] CA-XX-02: <descripción exacta del SDD>

## Estados del flujo implementados
- [x] idle
- [x] loading
- [x] success
- [x] error (codes manejados: <ERROR_CODE_1>, <ERROR_CODE_2>)
- [x] expired (si aplica)
- [x] empty (si aplica)

## error.code cubiertos con UX dedicada
- \`<ERROR_CODE>\`: <page-level | inline | toast> — \`src/modules/<m>/components/<X>.tsx\`

## Decisiones de implementación
<Decisiones tomadas no explícitas en el SDD. "Ninguna" si todo estaba especificado.>

## Divergencias del backend detectadas
<"Ninguna" o lista con link al issue \`sdd:divergence\` en adminprop-back>

## Checklist del autor
- [x] 6 estados del flujo cubiertos
- [x] Mensajes de seguridad literal del SDD
- [x] Permisos por \`permissions[]\` (no \`role_name\`)
- [x] Server state en TanStack Query (no Zustand)
- [x] Tipos desde \`src/api/generated/\`
- [x] HttpOnly cookies (no localStorage)
- [x] organization_id NO viaja desde el cliente
- [x] Descargas con Fetch + Blob
- [x] Sin adaptación al cliente HTTP por divergencias del backend
EOF
)"

PR_URL=$(gh pr view --repo "$ORG/$REPO" --json url --jq .url)
PR_NUMBER=$(gh pr view --repo "$ORG/$REPO" --json number --jq .number)
```

### 4.4 Asociación bidireccional PR ↔ issue + actualización de TODOs

Tras crear el PR, ejecutar **los tres pasos** sin omitir ninguno. La
asociación bidireccional vive en GitHub así:

- **Forward** (PR → issue): el body del PR tiene `Closes #N` (paso 4.3 ya
  lo escribió). Esto crea el "Linked pull request" automático en el
  sidebar del issue y dispara el cierre al mergear.
- **Backward** (issue → PR): comentario explícito en el issue + edición
  del body del issue con sección `## Pull Request`. Hace el link visible
  en el feed del issue y queda persistente.
- **Refuerzo simétrico**: comentario en el PR linkeando al issue (para
  navegación rápida desde el panel de reviewers).

```bash
# ─── Paso 1: PR al Project (idempotente; a veces GitHub lo agrega solo)
gh project item-add "$PROJECT_NUMBER" --owner "$ORG" --url "$PR_URL"
# El Project se mantiene en "In Progress" — el usuario lo mueve a "Done"
# al mergear. No existe el estado "In Review" en este repo.

# ─── Paso 2: actualizar el body del issue
#  (a) marcar como completados los TODOs de los CA-XX cubiertos por el PR
#  (b) agregar sección "## Pull Request" linkeando al PR

# 2.a — Descargar body actual del issue
ISSUE_BODY_FILE="/tmp/adminprop-issue-${ISSUE_NUMBER}-body.md"
gh issue view "$ISSUE_NUMBER" --repo "$ORG/$REPO" --json body --jq .body > "$ISSUE_BODY_FILE"

# 2.b — Marcar los checkboxes de los CA-XX cubiertos.
COVERED_CAS=("CA-XX-01" "CA-XX-02")   # editar con los CA reales del issue
for CA in "${COVERED_CAS[@]}"; do
  sed -i -E "s|^(\s*)- \[ \] (${CA}\b)|\1- [x] \2|g" "$ISSUE_BODY_FILE"
done

# 2.c — Agregar sección "## Pull Request" si no existe ya
if ! grep -q "^## Pull Request" "$ISSUE_BODY_FILE"; then
  cat >> "$ISSUE_BODY_FILE" <<EOF

## Pull Request
- $PR_URL (abierto $(date -u +%Y-%m-%dT%H:%M:%SZ))
EOF
fi

# 2.d — Subir el body actualizado al issue
gh issue edit "$ISSUE_NUMBER" --repo "$ORG/$REPO" --body-file "$ISSUE_BODY_FILE"

# ─── Paso 3: comentarios cross-referenciados
gh issue comment "$ISSUE_NUMBER" --repo "$ORG/$REPO" \
  --body "PR abierto: $PR_URL — TODOs cubiertos actualizados en el cuerpo del issue."

gh pr comment "$PR_NUMBER" --repo "$ORG/$REPO" \
  --body "Implementa #${ISSUE_NUMBER} — ver el cuerpo del issue para CA-XX cubiertos, estados del flujo y SDD de referencia."

echo "✓ PR #$PR_NUMBER ↔ issue #$ISSUE_NUMBER (forward via 'Closes', backward via comentario + body)"
echo "✓ Milestone: $MILESTONE"
```

### 4.5 Resumen de sesión

```
✅ SESIÓN FRONTEND COMPLETADA
────────────────────────────────────────────────────
Issue:    #<N> — <título>
Branch:   feature/<N>-<slug>
PR:       <PR_URL> (base: develop)
Estado:   In Progress — el usuario mergea y cierra la tarea

CRITERIOS DE ACEPTACIÓN
CA-XX-01 ✓  CA-XX-02 ✓  ...

ESTADOS DEL FLUJO
idle ✓  loading ✓  success ✓  error ✓  expired ✓  empty ✓

ERROR CODES CUBIERTOS
<ERROR_CODE_1> ✓  <ERROR_CODE_2> ✓  ...

ISSUES POTENCIALMENTE DESBLOQUEADOS (revisar tras el merge)
#<N> <título> — ejecutar para desbloquear:
gh issue edit <N> --repo $ORG/$REPO \
  --add-label "status:ready" \
  --remove-label "status:blocked"

DOCUMENTOS OPERATIVOS A ACTUALIZAR
Si esta tarea introdujo cambios en la operación del sistema, actualizar
ANTES de cerrar la sesión:

[ ] .env.example                          — si se agregó VITE_* nueva
[ ] RUNBOOK-LOCAL-002-frontend.md         — si cambiaron pasos de setup local
[ ] src/api/generated/                    — si cambió un response del backend

Si ninguno aplica: continuar con la próxima sesión.

PRÓXIMA SESIÓN
Releer este prompt en una nueva sesión de Claude Code para
continuar con la siguiente tarea del roadmap.
────────────────────────────────────────────────────
```

---

## NUNCA HACER (regla de oro)

- **Usar `--base feature/...` en un PR.** Todos los PRs van a `develop` sin excepción.
- **Crear el branch desde otro feature branch.** Siempre desde `develop` con `git pull origin develop`.
- **Omitir el bloque de actualización del body del issue** (Fase 4.4 paso 2). Marcar los TODOs en el issue es parte del contrato de "PR listo".
- **Omitir el comentario cross-referenciado** en el PR (Fase 4.4 paso 3). El `Closes #N` es necesario pero no suficiente — el comentario hace la asociación visible para el reviewer.
- **Intentar mover el item del Project a "In Review" o "Blocked" como columna.** Esos estados no existen; el Project sólo tiene `Todo`/`In Progress`/`Done`. Dejar en `In Progress` — el usuario lo cierra al mergear.
- **Agregar labels `status:in-progress`, `status:in-review` o `status:done`.** No existen en este repo. Sólo `status:ready`, `status:blocked` y `sdd:divergence`.
- Cerrar el issue antes del merge del PR.
- Inventar un endpoint que no existe en `sdd_03`.
- Adaptar el cliente HTTP a una API que diverge del SDD. Abrir issue `sdd:divergence` en `adminprop-back` y pausar.
- Guardar el access token o refresh token en `localStorage` / `sessionStorage`. Usar HttpOnly cookies (las setea el backend, el frontend sólo activa `withCredentials: true`).
- Enviar `organization_id` desde el cliente (excepto namespace `/superadmin/*`).
- Inferir el tenant del subdominio del browser (single-domain).
- Crear un endpoint o flujo de "switch de organización". No existe; el flujo es logout + login.
- Inventar un mensaje de seguridad. Usar el texto literal del SDD (anti-enumeration login, forgot-password, recovery codes).
- Asumir RFC 7807. El backend retorna formato CUSTOM `{ "error": { "code", "message", "field", "details" } }`.
- Validar permisos por `role_name`. Usar permisos atómicos del array `permissions[]` del JWT.
- Mostrar navegación a contratos, cobranzas o liquidaciones a un usuario con rol `maintenance`.
- Separar `/superadmin/*` en un build o app distinta (monorepo con builds múltiples). Vive en la misma app, protegida por ruta.
- Replicar lógica de negocio del backend (cálculos de ajuste por índice, saldo de cobro, validación de invariantes complejas).
- Guardar server state en Zustand. Server state vive en TanStack Query siempre.
- Usar `window.open()` o `<a href={url}>` para descargar archivos. Fetch + Blob obligatorio.
- Manejar todos los errores con `toast.error('Algo salió mal')`. Discriminar por `error.code` y rendir UX dedicada según corresponda.
- Saltar hooks (`--no-verify`) o forzar push (`--force` sin `--with-lease`).

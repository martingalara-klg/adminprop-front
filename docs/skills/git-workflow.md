# git-workflow

## Cuándo leer este skill

Leer **antes de**:

- Crear un branch nuevo (feature, bugfix, hotfix, chore, release).
- Hacer un commit.
- Abrir un Pull Request.
- Mergear o eliminar branches.
- Cualquier sesión de implementación de una tarea del GitHub Project.

Si la operación involucra el ciclo `develop → feature → PR → merge → develop`, este es el contrato.

## Stack relevante

| Capa | Tecnología | Fuente |
|---|---|---|
| Hosting | GitHub (`github.com/martingalara-klg/adminprop-back` y `adminprop-front`) | `gh repo view` |
| CLI principal | `gh` (autenticado como `martingalara-klg`) | `gh auth status` |
| Convención de commits | Conventional Commits (`feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `perf`) | Este skill |
| Estilo de branching | GitFlow adaptado (`main`, `develop`, `feature/*`, `bugfix/*`, `hotfix/*`, `chore/*`, `release/*`) | Este skill |

## SDDs de referencia

- `docs/sdd/core/sdd_03_api_contracts.md` §"Regla de oro" — los contratos no se modifican sin actualizar el SDD primero.
- `docs/sdd/_index.md` §6 "Estado de los SDDs" — versionado `1.x` para adiciones backwards-compatible, `2.x` para breaking changes.
- Backend `CLAUDE.md` §2 y Frontend `CLAUDE.md` §2 — el SDD manda; ante divergencia, detenerse y reportar.

## El patrón

### Estructura de branches

```
main                      ← producción. Protegida. Solo merge vía PR aprobado.
develop                   ← integración. Base de todos los feature branches.
release/vX.Y.Z            ← preparación de release. Solo bugfixes.
hotfix/<slug>             ← fix urgente sobre main.

feature/<issue-number>-<slug>   ← implementación de una tarea del roadmap
bugfix/<issue-number>-<slug>    ← corrección de un issue
chore/<slug>                    ← configuración, dependencias, CI (no requiere issue)
```

### Nomenclatura de branches derivada del issue

El nombre de un `feature/`, `bugfix/` o `hotfix/` se deriva del **número del issue de GitHub** y un slug descriptivo en kebab-case (3–5 palabras). Esto sirve para los dos repos (backend y frontend) sin prefijo adicional — el repo ya identifica el contexto.

Ejemplos:

```
feature/12-formulario-alta-contrato
feature/27-wizard-liquidacion-mensual
bugfix/45-calculo-saldo-cobro-redondeo
hotfix/72-fetch-icl-timeout-bloquea-liquidacion
chore/setup-ci-pipeline
```

Reglas:

- Todo en minúsculas.
- Palabras separadas por guión, sin underscore.
- El slug describe la **acción** o el **artefacto principal**, no el módulo (el módulo se infiere del issue).
- Si la tarea no tiene issue (ej: setup inicial de CI), usar `chore/<slug>` sin número.

### Convención de commits (Conventional Commits)

Plantilla:

```
<tipo>(<módulo>): <descripción imperativa en minúsculas, ≤ 72 chars>

<cuerpo opcional: qué cambia y por qué, no cómo>
<wrap a 72 chars>

<footer>
Closes #<issue-number>
Implements: CA-XX-01, CA-XX-02
Rule: RN-XX, RN-YY
```

Tipos válidos:

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad especificada en el SDD |
| `fix` | Corrección de bug |
| `test` | Agregar o corregir tests (especialmente CA-XX o flujos alternativos) |
| `refactor` | Cambio sin alterar comportamiento |
| `chore` | Configuración, dependencias, CI, scripts |
| `docs` | Actualización de SDD o documentación (incluye este directorio) |
| `perf` | Mejora de performance sin cambio de comportamiento |

El `<módulo>` es el slug del módulo afectado (`auth`, `properties`, `people`, `contracts`, `payments`, `settlements`, `maintenance`, `admin`, `notifications`, `account`, `superadmin`, etc.). Para cambios transversales: `shared`, `infra`, `ci`.

#### Ejemplos reales del proyecto

```
feat(contracts): implement contract creation form

Implements POST /contracts as specified in
spec_module_03_contratos.md §RF-02.

Closes #12
Implements: CA-RF02-01, CA-RF02-02
Rule: RN-01, RN-03
```

```
feat(payments): support per_property payment scope

Implements RF-03 de spec_module_04_cobranzas. Agrega selector de
scope al form y valida contra contract-coverage antes del submit.

Closes #34
Implements: CA-04-09, CA-04-10
Rule: RN-F-11
```

```
fix(settlements): reject period reopen with notes < 10 chars

El frontend aceptaba notas vacías y el backend rechazaba con 500.
Se agregó validación Zod alineada con spec_module_05_liquidaciones
§validaciones.

Closes #58
```

#### Regla de un commit por capa implementada

Para una tarea típica de frontend, dividir en al menos estos commits:

1. `feat(<módulo>): ...` — hooks + API client + tipos.
2. `feat(<módulo>): ...` — pages + components.
3. `test(<módulo>): ...` — tests Vitest/Playwright.

El reviewer puede aprobar capa por capa.

### Ciclo de vida de un branch

```
1. Crear desde develop (NUNCA desde main):
   git fetch origin
   git checkout develop
   git pull origin develop
   git checkout -b feature/<issue-number>-<slug>

2. Commits atómicos durante el desarrollo (uno por capa terminada y
   verificada — ver "regla de un commit por capa" arriba).

3. Antes del PR, rebase sobre develop (NO merge de develop dentro
   del feature branch):
   git fetch origin
   git rebase origin/develop
   # Resolver conflictos si los hay
   git push --force-with-lease origin feature/<issue-number>-<slug>

4. Abrir PR a develop (ver github-project-workflow.md):
   gh pr create --base develop ...

5. Tras merge, eliminar el branch local y remoto:
   git checkout develop
   git pull origin develop
   git branch -d feature/<issue-number>-<slug>
   git push origin --delete feature/<issue-number>-<slug>
```

### Reglas de protección de branches

Configuración esperada en GitHub (responsabilidad operativa del owner):

- **`main`**: require PR + review aprobado, status checks deben pasar, no force push, no delete, signed commits opcionales.
- **`develop`**: require PR, CI (lint + tests) debe pasar, no force push, no delete.

## Template

Template de commit message (HEREDOC para multi-line, lo usa el skill `github-project-workflow`):

```bash
git commit -m "$(cat <<'EOF'
<tipo>(<módulo>): <descripción imperativa>

<cuerpo opcional explicando QUÉ cambia y POR QUÉ (no CÓMO).
Referenciar el SDD por documento + sección.>

Closes #<issue-number>
Implements: CA-XX-01, CA-XX-02
Rule: RN-XX
EOF
)"
```

Template de creación de feature branch:

```bash
# Asumiendo $ISSUE_NUMBER y $SLUG ya definidos en la sesión
git fetch origin
git checkout develop
git pull origin develop
git checkout -b "feature/${ISSUE_NUMBER}-${SLUG}"
```

## Checklist pre-commit

- [ ] El branch nació de `develop`, no de `main`.
- [ ] El nombre del branch incluye el número del issue.
- [ ] El mensaje del commit usa Conventional Commits (`tipo(módulo): ...`).
- [ ] El cuerpo del commit referencia el SDD por documento + sección si introduce reglas de negocio.
- [ ] El footer incluye `Closes #N` cuando existe issue.
- [ ] El footer incluye `Implements: CA-XX-...` y `Rule: RN-XX` cuando aplica.
- [ ] Cada commit es atómico (una capa). No mezclar capas en un commit.
- [ ] Antes del `git push` final del PR, se hizo `git rebase origin/develop` (no `git merge develop`).

## Antipatrones

```bash
# ❌ Branch creado desde main
git checkout main
git checkout -b feature/12-new-endpoint

# ✅ Branch desde develop
git checkout develop
git pull origin develop
git checkout -b feature/12-new-endpoint
```

```bash
# ❌ Commit gigante mezclando capas
git add src/api/ src/modules/contracts/ tests/
git commit -m "wip contracts"

# ✅ Commits separados, uno por capa
git add src/api/contracts.api.ts src/modules/contracts/hooks/
git commit -m "feat(contracts): add hooks + API client"

git add src/modules/contracts/pages/ src/modules/contracts/components/
git commit -m "feat(contracts): implement contract creation UI"

git add src/modules/contracts/__tests__/
git commit -m "test(contracts): cover CA-RF02-01 to CA-RF02-04"
```

```bash
# ❌ Merge de develop dentro del feature branch
git checkout feature/12-new-endpoint
git merge develop

# ✅ Rebase
git fetch origin
git rebase origin/develop
git push --force-with-lease origin feature/12-new-endpoint
```

```bash
# ❌ Force push sin --force-with-lease
git push --force origin feature/12-new-endpoint

# ✅ Force-with-lease aborta el push si el remoto tiene commits nuevos
git push --force-with-lease origin feature/12-new-endpoint
```

```bash
# ❌ Subjects que no dicen nada
git commit -m "fix bug"
git commit -m "wip"

# ✅ Subjects que describen el cambio
git commit -m "fix(settlements): reject period reopen with notes < 10 chars"
git commit -m "feat(payments): wire payment form onto contract balance validation"
```

```bash
# ❌ Skip hooks (--no-verify) para evitar lint o tests
git commit --no-verify -m "feat(...): ..."

# ✅ Resolver el problema reportado por el hook
```

## Referencias

- `docs/sdd/core/sdd_03_api_contracts.md` §"Regla de oro" — ningún contrato API cambia sin actualizar el SDD primero. Este principio se traslada a la convención de commits: el footer `Rule:` y `Implements:` ata el código al SDD.
- `docs/sdd/_index.md` §6 — versionado de SDDs (`1.x` aditivo, `2.x` breaking) que el commit `docs(...)` debe respetar.
- Backend `CLAUDE.md` §8 "Comportamiento esperado de Claude Code" — "referenciar la regla de negocio (RN-XX) en el código cuando se implemente una invariante crítica" se materializa en el footer del commit.
- Frontend `CLAUDE.md` §8 — "nombrar los tests con el ID del criterio de aceptación (CA-XX o UC-XX) del SDD" es coherente con `test(...)` + `Implements:` en el footer.

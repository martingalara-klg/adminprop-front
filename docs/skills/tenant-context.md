# tenant-context (frontend)

## Cuándo leer este skill

Leer **antes de**:

- Implementar el flujo de auth (login, refresh, logout).
- Decidir cómo identificar el tenant activo en el cliente.
- Implementar UI condicional por rol (`owner` / `admin` / `maintenance`).
- Manejar usuarios con membresía en múltiples organizaciones.
- Cualquier UI que dependa de `organization_id`, `role` o `permissions[]`.

## Stack relevante

| Item | Valor | Fuente |
|---|---|---|
| Modelo multi-tenant cliente | **Single domain** (un solo dominio de la app; ningún subdominio por organización) | frontend `CLAUDE.md` §4 |
| Identificación del tenant | `org_id` en el JWT del backend (no en URL) | frontend `CLAUDE.md` §4 |
| Switch de organización | **NO existe endpoint** — el flujo es logout + login | `sdd_03` §"Convenciones Generales" |
| Storage del JWT | HttpOnly Secure cookie (no localStorage) | frontend `CLAUDE.md` §4 |
| Sesión cliente | Zustand con persist (sólo datos no sensibles: user_id, name, email, role, permissions, current_org metadata) | frontend `CLAUDE.md` §4 |
| Permisos | `permissions: string[]` atómico en el JWT (no `role_name`) | `sdd_03` §"Convenciones Generales" |
| RBAC en UI | Hook `usePermission(permission)` + componente `<RequirePermission permission="...">` | frontend `CLAUDE.md` §7 |
| Roles | `owner` / `admin` / `maintenance`. Propietarios e inquilinos **no** tienen login en MVP. | `docs/sdd/core/sdd_02_domain_model.md` |

## SDDs de referencia

- `docs/sdd/core/sdd_03_api_contracts.md` §"Convenciones Generales" — JWT shape (`org`, `permissions`, `is_super_admin`) y "no existe endpoint de cambio de organización".
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 — JWT en HttpOnly cookies, refresh rotativo.
- `docs/sdd/core/spec_module_00_superadmin.md` — Super Admin vive bajo `/superadmin/*` (misma app, protegida por `is_super_admin`).
- `docs/sdd/_index.md` §4 — decisiones que materializan este skill.
- Frontend `CLAUDE.md` §4 "Multi-tenant desde la perspectiva del cliente".
- Frontend `CLAUDE.md` §7 "Restricciones de rol visibles en UI".

## El patrón

### Identificación del tenant

El cliente **nunca** manipula `organization_id`. Lo obtiene del JWT del backend, que viene en la HttpOnly cookie. El frontend lo desencripta indirectamente: al hacer login, el backend retorna en el body de `/auth/login` un objeto `user` con la `organization` activa.

```typescript
// Shape esperado del response /auth/login (status authenticated)
type AuthenticatedResponse = {
  data: {
    status: 'authenticated'
    access_token: string   // (puede no usarse — la cookie es la fuente)
    expires_in: number
    user: {
      id: string
      name: string
      email: string
      role: 'owner' | 'admin' | 'maintenance'   // legacy, prefiero permissions[]
      permissions: string[]                      // ← discriminador real (sdd_03 §"Convenciones")
      organization: {
        id: string
        name: string
        slug: string
      }
      account_status: 'active' | 'pending_deletion' | 'anonymized'
      scheduled_anonymization_at?: string
    }
  }
}
```

### Store de sesión (Zustand)

```typescript
// src/shared/auth/session-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Session = {
  user_id: string
  name: string
  email: string
  permissions: string[]
  organization: { id: string; name: string; slug: string }
  is_super_admin?: boolean
  account_status: 'active' | 'pending_deletion' | 'anonymized'
  scheduled_anonymization_at?: string
}

type SessionState = {
  session: Session | null
  setSession: (session: Session) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'adminprop:session',
      // SDD: NO persistimos el access_token (vive en HttpOnly cookie).
      // Sólo metadatos no-sensibles del user/org actual.
      partialize: (state) => ({ session: state.session }),
    },
  ),
)
```

> Razón de persistir: cuando el usuario recarga la página, queremos mostrar la UI según rol antes de que el primer request al backend confirme la sesión. Si la cookie HttpOnly expiró, el primer request falla → logout → store se limpia. La cookie es la fuente de verdad; el store es UX.

### Hook `useSession`

```typescript
// src/shared/auth/useSession.ts
import { useSessionStore } from './session-store'

export function useSession() {
  return useSessionStore((s) => s.session)
}
```

### Hook `usePermission`

```typescript
// src/shared/auth/usePermission.ts
import { useSessionStore } from './session-store'

export function usePermission(permission: string): boolean {
  return useSessionStore((s) => s.session?.permissions?.includes(permission) ?? false)
}

export function usePermissions(permissions: string[]): boolean {
  return useSessionStore((s) => {
    if (!s.session) return false
    return permissions.every((p) => s.session!.permissions.includes(p))
  })
}
```

### Componente `<RequirePermission>`

```typescript
// src/shared/auth/RequirePermission.tsx
import { ReactNode } from 'react'
import { usePermission } from './usePermission'

type Props = { permission: string; children: ReactNode; fallback?: ReactNode }

export function RequirePermission({ permission, children, fallback = null }: Props) {
  const has = usePermission(permission)
  if (!has) return <>{fallback}</>
  return <>{children}</>
}
```

### El rol `maintenance` — sólo módulo de mantenimiento

`maintenance` es el rol del encargado de reparaciones. Sólo ve **órdenes de trabajo asignadas** y **sus cotizaciones**; nunca contratos, cobranzas ni liquidaciones. La UI le oculta todo lo demás.

```typescript
// src/shared/navigation/Sidebar.tsx
import { RequirePermission } from '@/shared/auth'
import { useSession } from '@/shared/auth/useSession'

export function Sidebar() {
  const session = useSession()

  return (
    <nav>
      {/* maintenance sólo ve esto: */}
      <RequirePermission permission="work-order:read">
        <NavLink to="/maintenance">Mis órdenes de trabajo</NavLink>
      </RequirePermission>

      {/* owner/admin ven el resto */}
      <RequirePermission permission="contract:read">
        <NavLink to="/contracts">Contratos</NavLink>
      </RequirePermission>
      <RequirePermission permission="payment:read">
        <NavLink to="/payments">Cobranzas</NavLink>
      </RequirePermission>
      <RequirePermission permission="settlement:read">
        <NavLink to="/settlements">Liquidaciones</NavLink>
      </RequirePermission>

      <RequirePermission permission="user:manage">
        <NavLink to="/admin/users">Usuarios</NavLink>
      </RequirePermission>
    </nav>
  )
}
```

> El backend enforza esto también: un usuario `maintenance` que intenta `GET /contracts` recibe `403 FORBIDDEN` (o `403 ROLE_REQUIRED`). El frontend sólo evita el dead-end.

### Logout

```typescript
// src/shared/auth/logout.ts
import { useSessionStore } from './session-store'
import { authApi } from '@/api/auth.api'

export async function logout() {
  try {
    await authApi.logout()
  } catch {
    // Aún si falla, limpiar el cliente
  }
  useSessionStore.getState().clearSession()
  window.location.assign('/login')
}
```

> `POST /auth/logout` invalida el refresh token server-side. El backend setea cookies expiradas en la response, lo que limpia las HttpOnly cookies del browser.

### Switch entre organizaciones — NO existe endpoint

`sdd_03 §"Convenciones Generales"` lo dice explícito: el usuario que pertenece a múltiples orgs debe hacer logout + login para operar sobre otra.

Si el email tiene múltiples membresías, el frontend puede mostrar un **selector durante el login**:

```typescript
// src/modules/auth/pages/LoginPage.tsx
// ... después de POST /auth/login con email+password, si el response incluye
// múltiples organizations, mostrar selector antes de completar el login
// (logout+login para cambiar de organización).
```

### Single domain — no hay subdominio por tenant

```typescript
// ❌ Inferir el tenant del subdominio
const subdomain = window.location.hostname.split('.')[0]
fetchData({ org_slug: subdomain })

// ✅ El tenant viene del JWT (del backend), no de la URL del cliente
const session = useSession()
// session.organization.id e session.organization.slug ya están seteados por /auth/login
```

### Super Admin — mismo dominio, ruta protegida

`/superadmin/*` vive en la **misma app** (no hay build separada). El JWT de Super Admin tiene `is_super_admin: true` y puede no tener `org` ni `permissions[]` de organización.

```typescript
// src/superadmin/routes.tsx
import { RequireSuperAdmin } from '@/shared/routing/RequireSuperAdmin'

export const superadminRoutes: RouteObject[] = [
  {
    path: '/superadmin',
    element: <RequireSuperAdmin />,
    children: [
      { path: 'organizations', element: <OrganizationsPage /> },
      { path: 'audit', element: <AuditLogPage /> },
    ],
  },
]
```

### Validación de membresía activa

El JWT puede estar desactualizado. En operaciones sensibles, el backend re-valida `organization_members.is_active = true`. El frontend NO replica esa lógica; confía en el backend y responde al `403 FORBIDDEN` apropiadamente.

```typescript
// Si el backend retorna 403 porque la membresía fue revocada → forzar logout
httpClient.interceptors.response.use(undefined, (error) => {
  const code = error.response?.data?.error?.code
  if (error.response?.status === 403 && code === 'MEMBERSHIP_INACTIVE') {
    logout()
  }
  return Promise.reject(error)
})
```

## Template

Inicialización completa del contexto al arranque de la app:

```typescript
// src/main.tsx
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { IntlProvider } from 'react-intl'

import { App } from './App'
import { queryClient } from '@/api/query-client'
import { useSessionStore } from '@/shared/auth/session-store'
import { authApi } from '@/api/auth.api'
import { AdminPropApiError } from '@/api/errors'

function Boot() {
  useEffect(() => {
    authApi
      .refresh()
      .then((response) => {
        useSessionStore.getState().setSession(response.data.user)
      })
      .catch((err: AdminPropApiError) => {
        useSessionStore.getState().clearSession()
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      })
  }, [])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="es-AR" messages={{}}>
        <Boot />
      </IntlProvider>
    </QueryClientProvider>
  </StrictMode>,
)
```

Plantilla de un componente con UI restringida:

```typescript
import { RequirePermission, usePermission } from '@/shared/auth'

export function <Module>Page() {
  const canManage = usePermission('<resource>:manage')

  return (
    <div>
      <RequirePermission permission="<resource>:read">
        <<Resource>Table />
      </RequirePermission>

      <RequirePermission permission="<resource>:manage">
        <Create<Resource>Button />
      </RequirePermission>

      {canManage && <DeleteAllButton />}
    </div>
  )
}
```

## Checklist pre-commit

- [ ] El JWT NO se almacena en `localStorage` ni `sessionStorage`; sólo en HttpOnly cookie (gestionada por el backend).
- [ ] El store de sesión persiste sólo metadatos no-sensibles (no tokens).
- [ ] La UI restringida por rol usa `<RequirePermission permission="...">` o `usePermission(...)`, NO checks por `role_name`.
- [ ] El logout invalida la sesión del cliente **y** llama a `POST /auth/logout`.
- [ ] El frontend NO intenta cambiar de organización vía endpoint; el flujo aprobado es logout + login.
- [ ] El subdominio del browser NO se usa para inferir el tenant; sólo el JWT.
- [ ] El rol `maintenance` sólo ve órdenes de trabajo asignadas y sus cotizaciones — la navegación a contratos, cobranzas y liquidaciones está oculta.
- [ ] `/superadmin/*` está protegido por `<RequireSuperAdmin>` en la misma app; no hay build separada.
- [ ] Al hidratar la sesión al boot (vía `/auth/refresh`), un fallo redirige a `/login`.

## Antipatrones

```typescript
// ❌ Guardar el access_token en localStorage
localStorage.setItem('access_token', response.data.access_token)
// XSS leak. Frontend CLAUDE.md §4 lo prohíbe.

// ✅ Confiar en la HttpOnly cookie que setea el backend
useSessionStore.getState().setSession(response.data.user)
```

```typescript
// ❌ Inferir el tenant del subdominio
const orgSlug = window.location.hostname.split('.')[0]

// ✅ El tenant viene del JWT (body de /auth/login o /auth/refresh)
const session = useSession()
const orgSlug = session?.organization.slug
```

```typescript
// ❌ Validar permisos por role_name
if (session.role === 'admin') {
  showFinanceButton()
}
// Frágil: no encaja con permisos custom.

// ✅ Validar por permisos atómicos del SDD §"Catálogo de Permisos"
if (usePermission('payment:read')) {
  showFinanceButton()
}
```

```typescript
// ❌ Crear un endpoint /v1/auth/switch-organization en el cliente
async function switchOrg(orgId: string) {
  await httpClient.post('/auth/switch-organization', { org_id: orgId })
}
// El endpoint NO existe en sdd_03. Inventarlo es divergencia.

// ✅ Logout + login
async function switchOrg() {
  await authApi.logout()
  navigate('/login')
}
```

```typescript
// ❌ Mostrar navegación a contratos/cobranzas/liquidaciones al rol maintenance
<NavLink to="/contracts">Contratos</NavLink>   // sin RequirePermission

// ✅ Ocultar según permissions[]
<RequirePermission permission="contract:read">
  <NavLink to="/contracts">Contratos</NavLink>
</RequirePermission>
```

```typescript
// ❌ Separar Super Admin en un build/dominio distinto
// un directorio de build propio para el portal admin  ← no existe en este diseño (sin monorepo de builds múltiples)

// ✅ Misma app, ruta protegida por is_super_admin
<Route path="/superadmin" element={<RequireSuperAdmin />}>...</Route>
```

## Referencias

- `docs/sdd/core/sdd_03_api_contracts.md` §"Convenciones Generales" — shape del JWT (`org`, `permissions`, `is_super_admin`); switch de org no existe.
- `docs/sdd/core/sdd_03_api_contracts.md` §"Catálogo de Permisos" — lista exhaustiva de permisos atómicos.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 — JWT RS256, access 8h, refresh 30d rotativo, HttpOnly cookies.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.3 — RBAC con principio de mínimo privilegio.
- `docs/sdd/core/spec_module_00_superadmin.md` — Super Admin sin `org_id`.
- Frontend `CLAUDE.md` §4 "Multi-tenant desde la perspectiva del cliente" — single domain, JWT manda.
- Frontend `CLAUDE.md` §4 "Almacenamiento del JWT" — HttpOnly cookies, nada en localStorage.
- Frontend `CLAUDE.md` §7 "Restricciones de rol visibles en UI" — `<RequirePermission>` y `usePermission`.
- `docs/sdd/_index.md` §4 — decisiones arquitectónicas que fundamentan este skill.

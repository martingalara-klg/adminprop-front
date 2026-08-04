# module-structure (frontend)

## Cuándo leer este skill

Leer **antes de**:

- Crear un módulo nuevo en `src/modules/`.
- Reorganizar la estructura interna de un módulo existente.
- Decidir dónde poner un componente, hook o página.
- Implementar una ruta del namespace `/superadmin/*`.

## Stack relevante

| Capa | Tecnología | Fuente |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | frontend `CLAUDE.md` §3 |
| App | **Una única app Vite** (`src/`); las rutas `/superadmin/*` viven en la misma app, protegidas por `is_super_admin` — no hay build separada ni monorepo de builds múltiples | frontend `CLAUDE.md` §3, §9 |
| Routing | **React Router** (lazy loading por ruta) | frontend `CLAUDE.md` §3, §4 |
| Estado servidor | **TanStack Query (React Query) v5** | frontend `CLAUDE.md` §3 |
| Estado UI | **Zustand** (sólo UI local, NO server state) | frontend `CLAUDE.md` §3 |
| HTTP | **Axios** con `withCredentials: true` | frontend `CLAUDE.md` §3, §4 |
| Forms | React Hook Form + Zod | frontend `CLAUDE.md` §3 |
| i18n | react-intl (`es-AR` default, `en-US`) | frontend `CLAUDE.md` §3 |
| UI components | shadcn/ui + Tailwind CSS (copiados al repo) | frontend `CLAUDE.md` §3 |
| Tests | Vitest + React Testing Library + Playwright (E2E) | frontend `CLAUDE.md` §3 |
| Component docs | Storybook (desde MVP) | frontend `CLAUDE.md` §3 |

## SDDs de referencia

- Frontend `CLAUDE.md` §4 "Arquitectura de frontend".
- Frontend `CLAUDE.md` §9 "Estructura del repositorio".
- `docs/sdd/core/sdd_03_api_contracts.md` — fuente de los tipos consumidos por la app (generados vía OpenAPI del backend local).

## El patrón

### Tree del repositorio

```
adminprop-front/
├── docs/
│   └── sdd/                          ← copia/sync de los SDDs (fuente de verdad; el original vive en adminprop-back)
│       ├── _index.md
│       ├── project_adminprop.md
│       ├── core/
│       ├── features/
│       └── infrastructure/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── properties/               ← propiedades
│   │   ├── people/                   ← personas (propietarios, inquilinos — sin login en MVP)
│   │   ├── contracts/                ← contratos
│   │   ├── payments/                 ← cobros
│   │   ├── settlements/              ← liquidaciones
│   │   ├── maintenance/              ← órdenes de trabajo + cotizaciones (rol maintenance)
│   │   ├── admin/                    ← usuarios, roles, settings de organización
│   │   ├── notifications/            ← panel in-app, preferencias
│   │   └── account/                  ← perfil, MFA, anonimización
│   ├── superadmin/                   ← rutas /superadmin/* (misma app, protegidas por is_super_admin)
│   │   └── modules/
│   │       ├── organizations/
│   │       └── audit/
│   ├── api/
│   │   ├── generated/                ← tipos generados desde OpenAPI del backend local (openapi-typescript)
│   │   ├── http-client.ts            ← Axios + interceptors
│   │   ├── auth.api.ts
│   │   ├── contracts.api.ts
│   │   └── ...
│   ├── shared/
│   │   ├── auth/                     ← sesión, refresh interceptor, hooks de permiso
│   │   ├── components/               ← Button, Input, DataGrid wrappers, Modal, Toast
│   │   ├── hooks/                    ← useDebounce, useLocalStorage, usePermission
│   │   ├── i18n/                     ← config react-intl + mensajes ES/EN
│   │   ├── routing/                  ← config compartida de React Router (guardas /superadmin/*)
│   │   ├── theme/                    ← Tailwind config + tokens (light + dark)
│   │   ├── utils/                    ← formatters (date, money), validators (Zod comunes)
│   │   └── types/                    ← types globales
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
├── tests/
│   ├── unit/                         ← Vitest + RTL
│   └── e2e/                          ← Playwright
├── .storybook/
├── public/
│   └── manifest.json                 ← PWA mínima
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

No hay monorepo de build tool con múltiples directorios de build por audiencia, ni paquete compartido separado, ni archivo de workspace de package manager (decisión default del diseño §5): una única app Vite con rutas `/superadmin/*` protegidas por el claim `is_super_admin` del JWT.

### Árbol de un módulo dentro de `src/modules/`

```
modules/<module-name>/                     ← kebab-case en el directorio
├── pages/
│   ├── <Module>ListPage.tsx                ← página de listado
│   ├── <Module>DetailPage.tsx              ← página de detalle
│   └── <Module>CreatePage.tsx              ← página de creación / wizard
├── components/
│   ├── <Module>Form.tsx
│   ├── <Module>StatusBadge.tsx
│   └── <Module>Table.tsx
├── hooks/
│   ├── use<Module>List.ts                  ← TanStack Query: list query
│   ├── use<Module>Detail.ts                ← TanStack Query: detail query
│   ├── useCreate<Module>.ts                ← TanStack Query: mutation
│   └── use<Module>Form.ts                  ← React Hook Form + Zod schema
├── schemas/
│   └── <module>.schema.ts                  ← Zod schemas (validación form)
├── types/
│   └── <module>.types.ts                   ← types del módulo (no API — esos vienen de src/api/generated)
├── routes.tsx                              ← rutas del módulo (importadas por App.tsx)
└── __tests__/
    ├── <module>.spec.tsx                   ← tests de hooks y componentes
    └── <module>-flow.spec.tsx              ← tests de flujo completo
```

### Responsabilidades por capa

| Capa | Hace | NO hace |
|---|---|---|
| `pages/` | Composición + routing + meta (título, layout). Importa hooks del módulo y componentes presentacionales. | Llamadas directas a Axios. Lógica de negocio. Reglas RN-XX. |
| `components/` | Presentacional puro. Recibe props, emite eventos (`onSubmit`, `onChange`). | Llamadas a API, llamadas a Zustand, validaciones complejas. |
| `hooks/` | Llamadas a API (vía TanStack Query), manejo de estados del flujo, transformación de datos. | JSX, renderizado. |
| `schemas/` | Zod schemas para validar inputs de forms. **Subset** de las invariantes del backend (feedback inmediato). | Lógica de negocio compleja (eso vive en backend). |
| `types/` | Tipos del módulo que no vienen de la API. | Redeclarar shapes de la API (esos vienen de `src/api/generated`). |
| `routes.tsx` | Definición de rutas con `lazy()` y `Suspense`. | Lógica de auth (eso va en guardas globales en `src/shared/routing/`). |

### Patrón: hook → page → component

#### Hook (TanStack Query)

```typescript
// src/modules/contracts/hooks/useContractsList.ts
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

type Filters = { property_id?: string; owner_id?: string; status?: string }

export function useContractsList(filters: Filters = {}) {
  return useQuery({
    queryKey: ['contracts', 'list', filters],
    queryFn: ({ signal }) => contractsApi.list(filters, { signal }),
    staleTime: 5 * 60_000,   // 5 min — alineado con backend (sdd_04 §1.4)
  })
}
```

#### Page (compone hooks + componentes, no lógica)

```typescript
// src/modules/contracts/pages/ContractsListPage.tsx
import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Spinner } from '@/shared/components/Spinner'
import { ErrorState } from '@/shared/components/ErrorState'
import { EmptyState } from '@/shared/components/EmptyState'
import { useContractsList } from '../hooks/useContractsList'
import { ContractsTable } from '../components/ContractsTable'
import { ContractsFilters } from '../components/ContractsFilters'

export function ContractsListPage() {
  const intl = useIntl()
  const [filters, setFilters] = useState({})
  const { data, isLoading, isError, error } = useContractsList(filters)

  if (isLoading) return <Spinner label={intl.formatMessage({ id: 'contracts.loading' })} />
  if (isError) return <ErrorState error={error} />
  if (!data || data.data.length === 0) {
    return <EmptyState title={intl.formatMessage({ id: 'contracts.empty.title' })} />
  }

  return (
    <>
      <ContractsFilters value={filters} onChange={setFilters} />
      <ContractsTable contracts={data.data} />
    </>
  )
}
```

#### Component (presentacional puro)

```typescript
// src/modules/contracts/components/ContractsTable.tsx
import { Link } from 'react-router-dom'
import type { Contract } from '@/api/generated'
import { ContractStatusBadge } from './ContractStatusBadge'

type Props = { contracts: Contract[] }

export function ContractsTable({ contracts }: Props) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Propiedad</th>
          <th>Inquilino</th>
          <th>Estado</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {contracts.map((contract) => (
          <tr key={contract.id}>
            <td>{contract.property?.address ?? '—'}</td>
            <td>{contract.tenant?.full_name ?? '—'}</td>
            <td><ContractStatusBadge status={contract.status} /></td>
            <td><Link to={`/contracts/${contract.id}`}>Ver</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

#### Schema (Zod) para forms

```typescript
// src/modules/contracts/schemas/contract.schema.ts
import { z } from 'zod'

export const createContractSchema = z.object({
  property_id: z.string().uuid('Propiedad inválida'),
  tenant_id: z.string().uuid('Inquilino inválido'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser AAAA-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser AAAA-MM-DD'),
  monthly_amount: z.number().positive('El monto debe ser mayor a 0'),
  index_type: z.enum(['ICL', 'IPC', 'fixed']),
})

export type CreateContractInput = z.infer<typeof createContractSchema>
```

### Registro de rutas

```typescript
// src/modules/contracts/routes.tsx
import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

const ContractsListPage = lazy(() => import('./pages/ContractsListPage').then(m => ({ default: m.ContractsListPage })))
const ContractDetailPage = lazy(() => import('./pages/ContractDetailPage').then(m => ({ default: m.ContractDetailPage })))
const CreateContractPage = lazy(() => import('./pages/CreateContractPage').then(m => ({ default: m.CreateContractPage })))

export const contractsRoutes: RouteObject[] = [
  { path: '/contracts', element: <ContractsListPage /> },
  { path: '/contracts/new', element: <CreateContractPage /> },
  { path: '/contracts/:contractId', element: <ContractDetailPage /> },
]
```

```typescript
// src/App.tsx
import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { contractsRoutes } from './modules/contracts/routes'
import { paymentsRoutes } from './modules/payments/routes'
import { superadminRoutes } from './superadmin/routes'   // protegidas por is_super_admin
import { Spinner } from '@/shared/components/Spinner'

const router = createBrowserRouter([
  ...contractsRoutes,
  ...paymentsRoutes,
  ...superadminRoutes,
])

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <RouterProvider router={router} />
    </Suspense>
  )
}
```

### El namespace `/superadmin/*`

Vive en la **misma app y el mismo build** — no hay un directorio de build separado para el portal de administración. La protección es a nivel de ruta:

```typescript
// src/shared/routing/RequireSuperAdmin.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/shared/auth/useSession'

export function RequireSuperAdmin() {
  const session = useSession()
  if (!session?.is_super_admin) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
```

### Convenciones de nombres

| Artefacto | Convención | Ejemplo |
|---|---|---|
| Carpeta del módulo | `kebab-case` | `modules/work-orders/` |
| Componente React | `PascalCase`, archivo `.tsx` | `WorkOrderForm.tsx` |
| Hook | `camelCase` con prefijo `use`, archivo `.ts` | `useWorkOrdersList.ts` |
| Schema Zod | `camelCase` con sufijo `Schema`, archivo `<module>.schema.ts` | `createWorkOrderSchema` |
| Type derivado del schema | `PascalCase` con sufijo `Input` | `CreateWorkOrderInput` |
| Página | `PascalCase` con sufijo `Page` | `WorkOrderDetailPage.tsx` |
| Ruta URL | `kebab-case` plural | `/work-orders/:id` |
| Test file | `<modulo>.spec.tsx` o `<modulo>-flow.spec.tsx` | `contracts.spec.tsx` |

## Template

Skeleton para crear un módulo nuevo:

```typescript
// src/modules/<module>/types/<module>.types.ts
export type <Module>FilterState = { status?: string; search?: string }
```

```typescript
// src/modules/<module>/schemas/<module>.schema.ts
import { z } from 'zod'
export const create<Module>Schema = z.object({ /* alineado con sdd_02 §invariantes */ })
export type Create<Module>Input = z.infer<typeof create<Module>Schema>
```

```typescript
// src/modules/<module>/hooks/use<Module>List.ts
import { useQuery } from '@tanstack/react-query'
import { <module>Api } from '@/api/<module>.api'

export function use<Module>List(filters = {}) {
  return useQuery({
    queryKey: ['<module>', 'list', filters],
    queryFn: ({ signal }) => <module>Api.list(filters, { signal }),
    staleTime: 5 * 60_000,
  })
}
```

```typescript
// src/modules/<module>/pages/<Module>ListPage.tsx
import { use<Module>List } from '../hooks/use<Module>List'
import { <Module>Table } from '../components/<Module>Table'
import { Spinner, ErrorState, EmptyState } from '@/shared/components'

export function <Module>ListPage() {
  const { data, isLoading, isError, error } = use<Module>List()
  if (isLoading) return <Spinner />
  if (isError) return <ErrorState error={error} />
  if (!data?.data?.length) return <EmptyState />
  return <<Module>Table items={data.data} />
}
```

## Checklist pre-commit

- [ ] El módulo está en `src/modules/<kebab-case>/`.
- [ ] Existe la estructura canónica: `pages/`, `components/`, `hooks/`, `schemas/`, `types/`, `routes.tsx`, `__tests__/`.
- [ ] Las pages no llaman a Axios directamente; usan hooks de `hooks/`.
- [ ] Los components son presentacionales (reciben props, emiten eventos).
- [ ] Los hooks usan **TanStack Query** para server state (no Zustand).
- [ ] Los tipos de request/response vienen de `src/api/generated/`, no se redeclaran.
- [ ] Las rutas usan `lazy()` + `Suspense` para code splitting por módulo.
- [ ] El módulo tiene `__tests__/<module>-flow.spec.tsx` cubriendo los estados del flujo (ver `flow-implementation.md`).
- [ ] Rutas bajo `/superadmin/*` están protegidas por `<RequireSuperAdmin>`, no por un build separado.

## Antipatrones

```typescript
// ❌ Llamar a Axios desde el componente
function ContractsList() {
  const [contracts, setContracts] = useState([])
  useEffect(() => { axios.get('/v1/contracts').then(r => setContracts(r.data.data)) }, [])
  return <ContractsTable contracts={contracts} />
}

// ✅ Hook con TanStack Query
function ContractsList() {
  const { data, isLoading } = useContractsList()
  if (isLoading) return <Spinner />
  return <ContractsTable contracts={data?.data ?? []} />
}
```

```typescript
// ❌ Lógica de negocio en el componente
function SettlementForm() {
  const handleSubmit = (data) => {
    const adjusted_amount = data.base_amount * 1.045   // ¡calcular ajuste ICL en cliente!
    api.post('/settlements/calculate', { ...data, adjusted_amount })
  }
}

// ✅ Frontend envía sólo lo necesario; el backend calcula el ajuste
function SettlementForm() {
  const handleSubmit = (data) => {
    api.post('/settlements/calculate', { property_id: data.property_id, period_id: data.period_id })
  }
}
```

```typescript
// ❌ Redeclarar tipos de la API
type Contract = { id: string; status: string /* ... probablemente desactualizado */ }

// ✅ Importar de los tipos generados
import type { Contract } from '@/api/generated'
```

```typescript
// ❌ Ruta cargada eagerly (sin lazy)
import { ContractsListPage } from './modules/contracts/pages/ContractsListPage'

// ✅ Lazy + Suspense
const ContractsListPage = lazy(() => import('./modules/contracts/pages/ContractsListPage').then(m => ({ default: m.ContractsListPage })))
```

```typescript
// ❌ Separar /superadmin/* en un build/app distinta
// un vite.config.ts propio para el portal de administración  ← no existe en este diseño

// ✅ Mismo build, ruta protegida por is_super_admin
<Route path="/superadmin" element={<RequireSuperAdmin />}>
  <Route path="organizations" element={<OrganizationsPage />} />
</Route>
```

## Referencias

- Frontend `CLAUDE.md` §3 "Stack de frontend" — librerías reales del proyecto.
- Frontend `CLAUDE.md` §4 "Performance" — lazy loading por ruta.
- Frontend `CLAUDE.md` §8 "Siempre hacer" — usar TanStack Query para server state, Zustand sólo para UI.
- Frontend `CLAUDE.md` §9 "Estructura del repositorio" — árbol de referencia.
- `docs/sdd/_index.md` §4 — decisiones sobre stack frontend, app única, code splitting.

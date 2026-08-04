# state-management (frontend)

## Cuándo leer este skill

Leer **antes de**:

- Decidir si un estado va en TanStack Query, Zustand o `useState`.
- Crear un nuevo store Zustand.
- Configurar caché de TanStack Query para un módulo.
- Persistir estado entre recargas (filtros, wizard, preferencias).
- Implementar optimistic updates o invalidaciones.

## Stack relevante

| Capa | Tecnología | Fuente |
|---|---|---|
| **Server state** | **TanStack Query v5** (React Query) — `staleTime`, `gcTime`, queryKey por dominio | frontend `CLAUDE.md` §3, §4 |
| **UI state local** | `useState` / `useReducer` | (Convención React) |
| **UI state persistente** | **Zustand** con `persist` (sólo UI local; nunca server state) | frontend `CLAUDE.md` §3 |
| **Forms** | React Hook Form + Zod (manejo propio del estado del form) | frontend `CLAUDE.md` §3 |
| **i18n locale** | react-intl + Zustand (preferencia del usuario) | frontend `CLAUDE.md` §3 |
| **Tema** | Zustand + Tailwind dark mode (light + dark desde MVP) | frontend `CLAUDE.md` §3 |
| **Auth/sesión** | Zustand `persist` (metadatos no-sensibles) — ver `tenant-context.md` | frontend `CLAUDE.md` §4 |

## SDDs de referencia

- `docs/sdd/core/sdd_04_nonfunctional.md` §1.4 — TTLs de caché por dominio.
- Frontend `CLAUDE.md` §3 — "TanStack Query para server state, Zustand sólo para UI local".
- Frontend `CLAUDE.md` §4 "Performance" — code splitting y `staleTime` por dominio.

## El patrón

### Regla central

> **El estado local es un caché del servidor, no la fuente de verdad.** Ante duda, refetchear desde el backend. No implementar lógica optimista sin respaldo en el SDD.

### Decisión: dónde vive cada estado

```
                                ┌────────────────────────────────────────┐
                                │ ¿El estado viene del backend?          │
                                └────────────┬───────────────────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ SÍ                          │ NO
                              ▼                             ▼
              ┌─────────────────────────┐   ┌─────────────────────────────┐
              │ TanStack Query          │   │ ¿Es persistente entre pages │
              │ - queryKey por dominio  │   │ o reload?                   │
              │ - staleTime de sdd_04 §1.4│  └─────┬───────────┬───────────┘
              │ - invalidación on write │        SÍ│         NO│
              └─────────────────────────┘         ▼            ▼
                                    ┌────────────────────┐  ┌─────────────────┐
                                    │ Zustand + persist  │  │ useState /      │
                                    │ (sólo UI local)    │  │ useReducer      │
                                    │ - wizard state     │  │ - form local    │
                                    │ - filtros globales │  │ - hover, modals │
                                    │ - tema, locale     │  │   abiertos      │
                                    └────────────────────┘  └─────────────────┘
```

### Server state: stores por módulo (TanStack Query)

#### Convención de queryKey

```
['<modulo>', '<sub-recurso>', ...filtros]

Ejemplos:
['contracts', 'list', { property_id, status }]
['contracts', 'detail', contractId]
['payments', 'list', { contract_id, from, to }]
['settlements', 'detail', settlementId]
['settlements', 'detail', settlementId, 'status']
['work-orders', 'assigned', personId]
['notifications', 'list']
```

Reglas:

- Primer elemento: nombre del módulo en `kebab-case`.
- Filtros como objeto en la última posición → React Query los hashea automáticamente.
- IDs como segundo o tercer elemento (no como string en la query string).

#### staleTime por dominio (alineado con `sdd_04 §1.4`)

| Query | staleTime | Razón |
|---|---|---|
| KPIs / indicadores de gestión | `15 * 60_000` | sdd_04 §1.4 |
| Listados de propiedades/personas/contratos | `5 * 60_000` | sdd_04 §1.4 |
| Configuración de organización | `5 * 60_000` | sdd_04 §1.4 |
| Badge de notificaciones | `5 * 60_000` | sdd_04 §1.4 |
| Detalle de una entidad | `60_000` | default — refetch on focus, suficiente |
| Polling de jobs async (`settlement.status`, `payment_batch.status`) | `0` + `refetchInterval` | requiere fresh data en cada poll |

#### Patrón: query + mutation con invalidación

```typescript
// src/modules/contracts/hooks/useContractsList.ts
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useContractsList(filters: { property_id?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['contracts', 'list', filters],
    queryFn: ({ signal }) => contractsApi.list(filters, { signal }),
    staleTime: 5 * 60_000,
  })
}
```

```typescript
// src/modules/contracts/hooks/useCreateContract.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useCreateContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: contractsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'list'] })
    },
  })
}
```

#### Polling con stop condition (jobs async)

```typescript
// src/modules/settlements/hooks/useSettlementStatus.ts
import { useQuery } from '@tanstack/react-query'
import { settlementsApi } from '@/api/settlements.api'

export function useSettlementStatus(settlementId: string, opts: { enabled: boolean }) {
  return useQuery({
    queryKey: ['settlements', 'detail', settlementId],
    queryFn: ({ signal }) => settlementsApi.get(settlementId, { signal }),
    enabled: opts.enabled && !!settlementId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      if (status === 'pending' || status === 'processing') return 3000
      return false   // stop polling
    },
  })
}
```

#### Optimistic updates — sólo con respaldo del SDD

```typescript
// Ejemplo: marcar una notificación como leída es seguro hacer optimistic
// porque el SDD lo permite y el rollback es trivial.
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const previous = queryClient.getQueryData(['notifications', 'list'])
      queryClient.setQueryData(['notifications', 'list'], (old: any) => {
        if (!old) return old
        return { ...old, data: old.data.map((n: any) => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n) }
      })
      return { previous }
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications', 'list'], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
```

> No hacer optimistic en operaciones financieras (registro de cobros, cálculo de liquidaciones). El SDD no garantiza idempotencia ahí; un rollback parcial deja la UI inconsistente.

### Zustand: stores por dominio

#### Convención

```
useUiStore                ← layout, sidebar, modales globales, theme
useSessionStore           ← sesión actual (ver tenant-context.md)
useSettlementWizardStore  ← estado del wizard de liquidación (persist)
useGlobalFiltersStore     ← filtros globales de indicadores/reportes
```

#### Theme (light + dark desde MVP)

```typescript
// src/shared/theme/theme-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

type ThemeState = { theme: Theme; setTheme: (theme: Theme) => void }

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        applyThemeToHtml(theme)
      },
    }),
    { name: 'adminprop:theme' },
  ),
)

function applyThemeToHtml(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', dark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}
```

#### Filtros globales (indicadores)

```typescript
// src/modules/reports/state/global-filters.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type GlobalFiltersState = {
  property_ids: string[]
  owner_ids: string[]
  from: string | null
  to: string | null
  setFilters: (patch: Partial<GlobalFiltersState>) => void
  reset: () => void
}

const DEFAULT_STATE = { property_ids: [], owner_ids: [], from: null, to: null }

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setFilters: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set(DEFAULT_STATE),
    }),
    { name: 'adminprop:report-filters' },
  ),
)
```

#### Wizard de liquidación (estado persistente, multipaso)

Ver `flow-implementation.md` §"Wizard multipaso" para el ejemplo completo. Patrón: `Zustand + persist`, `wizard_token` desde el backend cuando aplica.

### Forms: React Hook Form (estado local del form)

NO crear un store Zustand para el estado del form. RHF maneja `values`, `errors`, `isDirty`, `isSubmitting` y se integra con Zod.

```typescript
// src/modules/payments/hooks/usePaymentForm.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentInput } from '../schemas/payment.schema'

export function usePaymentForm(defaultValues?: Partial<PaymentInput>) {
  return useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { contract_id: '', amount: 0, payment_date: new Date().toISOString().slice(0, 10), ...defaultValues },
  })
}
```

### Sincronización entre stores

```typescript
// src/shared/auth/logout.ts
import { queryClient } from '@/api/query-client'
import { useSessionStore } from './session-store'
import { useSettlementWizard } from '@/modules/settlements/settlement-wizard/state'
import { authApi } from '@/api/auth.api'

export async function logout() {
  try {
    await authApi.logout()
  } catch {}

  queryClient.clear()
  useSessionStore.getState().clearSession()
  useSettlementWizard.getState().reset()

  window.location.assign('/login')
}
```

### Cache de Zustand vs cache de TanStack Query

- **TanStack Query** persiste en memoria (no en localStorage por default). Al recargar la página, se pierde. Esto es lo correcto para server state: queremos refetchear.
- **Zustand `persist`** usa localStorage por default. Persiste entre reloads. Esto es lo correcto para UI: queremos que el wizard sobreviva un reload, que el theme persista.

## Template

Hook canónico de query:

```typescript
// src/modules/<module>/hooks/use<Module>List.ts
import { useQuery } from '@tanstack/react-query'
import { <module>Api } from '@/api/<module>.api'

type Filters = { /* según sdd_03 */ }

export function use<Module>List(filters: Filters = {}) {
  return useQuery({
    queryKey: ['<module>', 'list', filters],
    queryFn: ({ signal }) => <module>Api.list(filters, { signal }),
    staleTime: <ttl-de-sdd_04 §1.4>,
  })
}
```

Hook canónico de mutation con invalidación:

```typescript
// src/modules/<module>/hooks/useCreate<Module>.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { <module>Api } from '@/api/<module>.api'

export function useCreate<Module>() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: <module>Api.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['<module>'] }) },
  })
}
```

Store Zustand canónico:

```typescript
// src/modules/<module>/state/<feature>.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type <Feature>State = { set<X>: (v: <T>) => void; reset: () => void }
const DEFAULT_STATE = { /* ... */ }

export const use<Feature> = create<<Feature>State>()(
  persist(
    (set) => ({ ...DEFAULT_STATE, set<X>: (v) => set({ <X>: v }), reset: () => set(DEFAULT_STATE) }),
    { name: 'adminprop:<feature>' },
  ),
)
```

## Checklist pre-commit

- [ ] El estado del servidor está en **TanStack Query**, no en Zustand.
- [ ] El estado UI persistente (wizard, filtros, theme) está en **Zustand con `persist`**.
- [ ] El estado del form vive en **React Hook Form**, no en Zustand.
- [ ] El estado local efímero (modal abierto, hover) vive en `useState`.
- [ ] El `queryKey` sigue la convención `[<module>, <sub-resource>, ...filters]`.
- [ ] El `staleTime` está alineado con `sdd_04 §1.4`.
- [ ] Las mutations invalidan las queries afectadas con `queryClient.invalidateQueries`.
- [ ] Optimistic updates sólo se usan en operaciones idempotentes y con rollback claro.
- [ ] El polling de jobs async se detiene cuando el estado llega a terminal.
- [ ] Al logout, el `queryClient.clear()` y los stores Zustand con `persist` se resetean.
- [ ] Ningún token JWT vive en Zustand `persist` (HttpOnly cookies son la fuente).
- [ ] Los stores Zustand tienen un nombre prefijado con `adminprop:` para namespace.

## Antipatrones

```typescript
// ❌ Server state en Zustand
const useContractsStore = create((set) => ({
  contracts: [], isLoading: false,
  fetchContracts: async () => { set({ isLoading: true }); const r = await axios.get('/v1/contracts'); set({ contracts: r.data.data, isLoading: false }) },
}))

// ✅ TanStack Query
function useContractsList() {
  return useQuery({ queryKey: ['contracts', 'list'], queryFn: () => contractsApi.list(), staleTime: 5 * 60_000 })
}
```

```typescript
// ❌ Token JWT en Zustand persist
const useAuth = create<{ token: string | null }>()(persist((set) => ({ token: null, setToken: (t) => set({ token: t }) }), { name: 'adminprop:auth' }))

// ✅ Token en HttpOnly cookie (backend la setea); store persiste sólo metadatos
const useSessionStore = create()(persist((set) => ({ session: null }), {
  name: 'adminprop:session',
  partialize: (state) => ({ session: state.session }),
}))
```

```typescript
// ❌ Invalidación granular incorrecta
queryClient.invalidateQueries({ queryKey: ['contracts', 'list', currentFilters] })

// ✅ Invalidar el prefijo (todas las variantes)
queryClient.invalidateQueries({ queryKey: ['contracts', 'list'] })
```

```typescript
// ❌ Optimistic update en operación crítica
useMutation({
  mutationFn: paymentsApi.create,
  onMutate: (payload) => {
    queryClient.setQueryData(['contracts', payload.contract_id], (old) => ({ ...old, balance: old.balance - payload.amount }))
  },
})

// ✅ Esperar la respuesta real antes de mostrar el saldo actualizado
useMutation({
  mutationFn: paymentsApi.create,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
})
```

```typescript
// ❌ No limpiar caché al logout
async function logout() { await authApi.logout(); window.location = '/login' }

// ✅ Limpiar TODO al logout
async function logout() {
  await authApi.logout()
  queryClient.clear()
  useSessionStore.getState().clearSession()
  useSettlementWizard.getState().reset()
  window.location.assign('/login')
}
```

## Referencias

- `docs/sdd/core/sdd_04_nonfunctional.md` §1.4 — TTLs de caché por dominio.
- Frontend `CLAUDE.md` §3 — "TanStack Query para server state, Zustand sólo para UI local".
- Frontend `CLAUDE.md` §4 "Performance" — `staleTime` alineado con backend, code splitting.
- Frontend `CLAUDE.md` §8 "Siempre hacer" — usar TanStack Query, no replicar lógica de servidor en cliente.
- `docs/sdd/_index.md` §4 — decisiones que fundamentan la separación de estado.
- `docs/sdd/core/sdd_03_api_contracts.md` §"Async pattern" — polling de jobs `202 Accepted`.

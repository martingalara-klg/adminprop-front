# api-client (frontend)

## Cuándo leer este skill

Leer **antes de**:

- Crear un nuevo cliente HTTP para un endpoint del backend.
- Modificar el interceptor de Axios (auth, refresh, errores).
- Configurar TanStack Query (defaults, retry, staleTime).
- Manejar 401, 429, 502 globalmente.

## Stack relevante

| Capa | Tecnología | Fuente |
|---|---|---|
| HTTP client | **Axios** con `withCredentials: true` | frontend `CLAUDE.md` §3, §4 |
| Tipos | Generados desde **OpenAPI** del backend (FastAPI) local, en `src/api/generated/` | frontend `CLAUDE.md` §3, §9 |
| Auth | JWT en **HttpOnly Secure cookie** (no localStorage); refresh transparente vía interceptor | frontend `CLAUDE.md` §4 |
| Server state | TanStack Query v5 | frontend `CLAUDE.md` §3 |
| Base URL | `VITE_API_BASE_URL = http://localhost:8000/v1` en local; `https://api.adminprop.local/v1` <!-- dominio provisorio hasta definir infra --> en el resto de ambientes | frontend `CLAUDE.md` §3 |
| CORS | `withCredentials: true` para que la cookie viaje | frontend `CLAUDE.md` §4 |

## SDDs de referencia

- `docs/sdd/core/sdd_03_api_contracts.md` §"Convenciones Generales" — formato custom de error, paginación, async 202.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 — refresh de JWT (8h access + 30d refresh rotativo).
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2a — anti-enumeration (forgot-password siempre 200).
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.4 — CSRF: cookies HttpOnly + `SameSite=Lax`.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.5 — rate limits que el cliente honra via `Retry-After`.
- Frontend `CLAUDE.md` §5 "Contratos de API" — endpoints consumidos.

## El patrón

### Configuración base del cliente HTTP

```typescript
// src/api/http-client.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/v1'

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  withCredentials: true,    // SDD §4 — la cookie HttpOnly viaja en cada request
  headers: {
    'Content-Type': 'application/json',
  },
})
```

> `withCredentials: true` requiere que el backend setee CORS con `Access-Control-Allow-Credentials: true` y un origin específico (no `*`). En local, el origin es `http://localhost:5173`; en el resto de ambientes, los origins definitivos se confirman con la infra <!-- dominio provisorio hasta definir infra -->.

### Interceptor de request: propagar `X-Request-Id`

```typescript
// src/api/http-client.ts (continuación)
import { v4 as uuidv4 } from 'uuid'

httpClient.interceptors.request.use((config) => {
  // Propagar request_id para distributed tracing (backend lo registra en logs)
  config.headers['X-Request-Id'] = config.headers['X-Request-Id'] ?? uuidv4()
  return config
})
```

El backend (`sdd_04 §4.6`) propaga el `X-Request-Id` en logs, jobs y notificaciones. Si el frontend lo envía, lo respeta; si no, lo genera. Tener el ID generado por el cliente facilita el debugging cross-stack.

### Interceptor de response: refresh transparente del JWT en 401

```typescript
// src/api/http-client.ts (continuación)
import { authApi } from './auth.api'

let refreshPromise: Promise<void> | null = null

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retried?: boolean }
    const status = error.response?.status

    // SDD: backend retorna 401 UNAUTHORIZED cuando el access token expiró
    if (status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true

      try {
        refreshPromise = refreshPromise ?? authApi.refresh()
        await refreshPromise
        refreshPromise = null
        return httpClient.request(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        window.location.assign('/login')
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
```

### Manejo global de `Retry-After` en 429

```typescript
// src/api/http-client.ts (continuación)
import { toast } from '@/shared/components/Toast'

httpClient.interceptors.response.use(undefined, (error: AxiosError) => {
  const status = error.response?.status
  if (status === 429) {
    const retryAfter = parseInt(error.response?.headers['retry-after'] ?? '60', 10)
    toast.warning(
      `Demasiadas solicitudes. Esperá ${retryAfter} segundos e intentá nuevamente.`,
    )
  }
  return Promise.reject(error)
})
```

### Clientes por módulo

Un archivo de cliente por módulo del SDD (no un cliente monolítico).

```typescript
// src/api/contracts.api.ts
import { httpClient } from './http-client'
import type {
  Contract,
  ContractListResponse,
  ContractCreateRequest,
} from './generated'   // ← tipos del OpenAPI del backend local

type Filters = {
  property_id?: string
  owner_id?: string
  status?: 'draft' | 'active' | 'terminated' | 'expired'
  cursor?: string
  limit?: number
}

export const contractsApi = {
  async list(filters: Filters, opts?: { signal?: AbortSignal }): Promise<ContractListResponse> {
    const response = await httpClient.get<ContractListResponse>('/contracts', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  async get(contractId: string, opts?: { signal?: AbortSignal }): Promise<{ data: Contract }> {
    const response = await httpClient.get<{ data: Contract }>(`/contracts/${contractId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  async create(payload: ContractCreateRequest): Promise<{ data: Contract }> {
    // SDD: sdd_03 §"Contratos" POST /contracts
    const response = await httpClient.post<{ data: Contract }>('/contracts', payload)
    return response.data
  },
}
```

### Configuración de TanStack Query

```typescript
// src/api/query-client.ts
import { QueryClient } from '@tanstack/react-query'
import { AdminPropApiError } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 min default; cada hook puede sobreescribir según el SDD
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        // No reintentar 4xx (errores de negocio o auth)
        if (error instanceof AdminPropApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,   // mutations no se reintentan automáticamente
    },
  },
})
```

### Tipado del error custom

```typescript
// src/api/errors.ts
import { AxiosError } from 'axios'

export type AdminPropErrorBody = {
  error: {
    code: string
    message: string
    field?: string | null
    details?: Record<string, unknown>
  }
}

export class AdminPropApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly field?: string | null,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AdminPropApiError'
  }
}

export function mapError(error: unknown): AdminPropApiError {
  if (error instanceof AdminPropApiError) return error

  if (error instanceof AxiosError && error.response) {
    const body = error.response.data as Partial<AdminPropErrorBody> | undefined
    const err = body?.error
    return new AdminPropApiError(
      err?.code ?? 'INTERNAL_ERROR',
      error.response.status,
      err?.message ?? 'Ocurrió un error inesperado.',
      err?.field ?? null,
      err?.details,
    )
  }

  return new AdminPropApiError('INTERNAL_ERROR', 0, 'Error de red.')
}
```

### Estructura `{ data, meta }` en respuestas

`sdd_03` impone `{ data: ..., meta: ... }` como envoltorio. El cliente no lo aplana — el consumer lee `response.data` (data) y `response.meta` (paginación) según corresponda.

```typescript
// src/api/types/list-response.ts
export type ListResponse<T> = {
  data: T[]
  meta: {
    next_cursor: string | null
    limit: number
  }
}
```

### Paginación cursor-based

```typescript
import { useInfiniteQuery } from '@tanstack/react-query'

export function useContractsInfinite(filters: Filters = {}) {
  return useInfiniteQuery({
    queryKey: ['contracts', 'infinite', filters],
    queryFn: ({ pageParam, signal }) => contractsApi.list({ ...filters, cursor: pageParam }, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? undefined,
  })
}
```

### Descarga de archivos (Fetch + Blob, NO `window.open`)

Los comprobantes de liquidaciones y de cobros se entregan como archivos servidos por el backend desde el filesystem local vía volumen Docker en MVP (storage cloud post-infra). El patrón de descarga es el mismo en cualquiera de los dos casos: Fetch + Blob.

```typescript
// src/api/download.ts
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
```

### Polling de jobs async (202 Accepted)

```typescript
// src/modules/settlements/hooks/useSettlementStatus.ts
import { useQuery } from '@tanstack/react-query'
import { settlementsApi } from '@/api/settlements.api'

export function useSettlementStatus(settlementId: string) {
  return useQuery({
    queryKey: ['settlements', settlementId, 'status'],
    queryFn: ({ signal }) => settlementsApi.get(settlementId, { signal }),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      if (status === 'pending' || status === 'processing') return 3000   // 3s
      return false   // detener polling
    },
  })
}
```

## Template

Skeleton de un nuevo cliente API:

```typescript
// src/api/<module>.api.ts
import { httpClient } from './http-client'
import type {
  <Resource>,
  <Resource>ListResponse,
  <Resource>CreateRequest,
} from './generated'

type Filters = {
  // ... según sdd_03 §<sección>
  cursor?: string
  limit?: number
}

export const <module>Api = {
  async list(filters: Filters = {}, opts?: { signal?: AbortSignal }): Promise<<Resource>ListResponse> {
    const response = await httpClient.get<<Resource>ListResponse>('/<resource>s', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  async get(resourceId: string, opts?: { signal?: AbortSignal }): Promise<{ data: <Resource> }> {
    const response = await httpClient.get<{ data: <Resource> }>(`/<resource>s/${resourceId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  async create(payload: <Resource>CreateRequest): Promise<{ data: <Resource> }> {
    const response = await httpClient.post<{ data: <Resource> }>('/<resource>s', payload)
    return response.data
  },
}
```

Skeleton de un hook TanStack Query:

```typescript
// src/modules/<module>/hooks/use<Module>List.ts
import { useQuery } from '@tanstack/react-query'
import { <module>Api } from '@/api/<module>.api'

export function use<Module>List(filters = {}) {
  return useQuery({
    queryKey: ['<module>', 'list', filters],
    queryFn: ({ signal }) => <module>Api.list(filters, { signal }),
    staleTime: 5 * 60_000,   // según sdd_04 §1.4
  })
}
```

## Checklist pre-commit

- [ ] `withCredentials: true` está habilitado en la instancia Axios.
- [ ] El interceptor de request adjunta `X-Request-Id`.
- [ ] El interceptor de response maneja 401 con refresh transparente + retry (única vez por request); si el refresh falla → `/login`.
- [ ] El interceptor maneja 429 globalmente (`Retry-After`).
- [ ] El cliente NO toca `localStorage` ni `sessionStorage` para tokens (HttpOnly cookies).
- [ ] Los tipos del request/response vienen de `src/api/generated/` (generados desde OpenAPI del backend local), no se redeclaran.
- [ ] Cada módulo tiene su archivo `<module>.api.ts`; no hay un cliente monolítico.
- [ ] La paginación es cursor-based por defecto; audit-logs es la única excepción (page/page_size).
- [ ] Los endpoints async (`POST /settlements/calculate`, `POST /payments/generate`, etc.) retornan `202 Accepted` y el cliente polea el detail o espera notificación in-app.
- [ ] Descargas de archivos usan **Fetch + Blob**, no `window.open(url)` ni `<a href={url}>`.
- [ ] TanStack Query no reintenta 4xx automáticamente (sólo 5xx).
- [ ] `staleTime` de cada query está alineado con `sdd_04 §1.4`.

## Antipatrones

```typescript
// ❌ Adaptar el frontend para compensar una API que diverge del SDD
if (response.status === 201 || response.status === 202) {
  // pollear igual
}

// ✅ Reportar la divergencia como issue sdd:divergence y pausar.
```

```typescript
// ❌ Guardar el JWT en localStorage
localStorage.setItem('access_token', token)
// XSS leak directo. SDD §2.2 prohíbe esto.

// ✅ HttpOnly cookies + withCredentials
// El backend setea la cookie en /v1/auth/login (Set-Cookie HttpOnly).
```

```typescript
// ❌ Múltiples requests disparan múltiples refresh en paralelo
if (status === 401) {
  await authApi.refresh()
  return httpClient.request(config)
}

// ✅ Coalescer: un sólo refresh in-flight
let refreshPromise: Promise<void> | null = null
```

```typescript
// ❌ Aplanar la estructura { data, meta }
async function list(): Promise<Contract[]> {
  const response = await httpClient.get('/contracts')
  return response.data.data   // pierde meta.next_cursor
}

// ✅ Mantener la estructura del SDD
async function list(): Promise<ContractListResponse> {
  const response = await httpClient.get<ContractListResponse>('/contracts')
  return response.data
}
```

```typescript
// ❌ window.open() para descargar un PDF de liquidación
function downloadSettlementPdf(url: string) {
  window.open(url, '_blank')
}

// ✅ Fetch + Blob
async function downloadSettlementPdf(url: string, filename: string) {
  const response = await fetch(url, { credentials: 'include' })
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}
```

## Referencias

- `docs/sdd/core/sdd_03_api_contracts.md` §"Convenciones Generales" — base URL `/v1`, formato `{ data, meta }`, paginación cursor-based, formato de error CUSTOM.
- `docs/sdd/core/sdd_04_nonfunctional.md` §1.4 — TTL de caché por tipo de query.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 — JWT en HttpOnly Secure cookies; refresh rotativo 30d single-use.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2a — anti-enumeration en forgot-password.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.5 — rate limits que el cliente respeta via `Retry-After`.
- `docs/sdd/core/sdd_04_nonfunctional.md` §4.6 — `X-Request-Id` para distributed tracing.
- Frontend `CLAUDE.md` §4 "Almacenamiento del JWT" — prohibido localStorage.
- Frontend `CLAUDE.md` §5 "Manejo de respuestas HTTP" — tabla por status code.
- Frontend `CLAUDE.md` §5 "Descarga de archivos" — Fetch + Blob obligatorio.
- `docs/sdd/_index.md` §4 — JWT en HttpOnly cookies, tipos generados desde OpenAPI del backend local, descargas Fetch+Blob.

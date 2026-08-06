# flow-implementation (frontend)

## Cuándo leer este skill

Leer **antes de**:

- Implementar una pantalla nueva.
- Manejar los estados de un flujo (loading, error, expired, empty).
- Decidir cómo procesar un `error.code` en UI.
- Construir un wizard multipaso (ej: wizard de liquidación mensual).
- Manejar el patrón async `202 Accepted` + polling.

## Stack relevante

| Capa | Tecnología | Fuente |
|---|---|---|
| Estado servidor | TanStack Query v5 | frontend `CLAUDE.md` §3 |
| Estado UI/flow | Zustand (cuando es persistente entre pages) o `useState` (cuando es local) | frontend `CLAUDE.md` §3 |
| Forms | React Hook Form + Zod | frontend `CLAUDE.md` §3 |
| Routing | React Router (lazy) | frontend `CLAUDE.md` §3, §4 |
| i18n | react-intl | frontend `CLAUDE.md` §3 |
| Notificaciones in-app | Polling + lectura de `/v1/notifications` | `sdd_03 §15` |

## SDDs de referencia

- `docs/sdd/core/sdd_01_prd.md` §3 — UC-01..UC-N con criterios de aceptación.
- `docs/sdd/core/sdd_03_api_contracts.md` — códigos de error que el flujo debe manejar.
- Frontend `CLAUDE.md` §5 "Manejo de respuestas HTTP" — tabla de comportamiento por status.
- Frontend `CLAUDE.md` §6 "Flujos de usuario definidos en los SDDs" — estados a manejar por flujo.
- Frontend `CLAUDE.md` §7 "Reglas de negocio relevantes para el frontend" — mensajes literales del SDD.

## El patrón

### Los 6 estados de cualquier flujo

Cada flujo debe manejar explícitamente **todos** estos estados. Simplificar a "loading / success / error" es insuficiente.

| Estado | Cuándo aparece | Qué mostrar |
|---|---|---|
| `idle` | Sin acción del usuario, sin request en curso. | Form vacío, lista pre-fetch, CTA principal. |
| `loading` | Request pendiente. | Spinner (operación atómica) o skeleton (listado). |
| `success` | Operación completada con datos. | Datos + posibles CTAs siguientes. |
| `error` | Error de servidor con `error.code` específico. | Mensaje legible por código + acción (reintentar, cancelar, ir a otro lado). |
| `expired` | Token o sesión expirada (FA-XX del SDD). | UI específica con CTA de re-iniciar el flujo. |
| `empty` | Operación OK sin datos para mostrar. | Mensaje + CTA para crear el primer recurso. |

```typescript
// src/modules/contracts/pages/ContractsListPage.tsx
import { useContractsList } from '../hooks/useContractsList'
import { Spinner, EmptyState, ErrorStateByCode } from '@/shared/components'
import { ContractsTable } from '../components/ContractsTable'
import { FormattedMessage } from 'react-intl'

export function ContractsListPage() {
  const { data, isLoading, isError, error, refetch } = useContractsList()

  // 1. loading
  if (isLoading) return <Spinner aria-label="Cargando contratos" />

  // 2. error — discriminado por error.code (ver error-handling.md)
  if (isError) return <ErrorStateByCode error={error} onRetry={refetch} />

  // 3. empty
  if (!data?.data?.length) {
    return (
      <EmptyState
        title={<FormattedMessage id="contracts.empty.title" defaultMessage="No tenés contratos todavía" />}
        action={<CreateContractCta />}
      />
    )
  }

  // 4. success
  return <ContractsTable contracts={data.data} />
}
```

### Estados específicos de flujos definidos en SDD

#### Login (sdd_03 §1)

`POST /auth/login` tiene un único resultado exitoso (`status: "authenticated"`) — MFA es post-MVP (`sdd_04` §2.2b), sin flujos de challenge o enrollment en el MVP. El frontend discrimina éxito vs error:

```typescript
// src/modules/auth/hooks/useLoginFlow.ts
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { authApi } from '@/api/auth.api'

type LoginFlowState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'authenticated' }
  | { kind: 'error'; code: string; message: string }

export function useLoginFlow() {
  const navigate = useNavigate()
  const [state, setState] = useState<LoginFlowState>({ kind: 'idle' })

  const mutation = useMutation({
    mutationFn: authApi.login,
    onMutate: () => setState({ kind: 'loading' }),
    onSuccess: () => {
      setState({ kind: 'authenticated' })
      navigate('/')
    },
    onError: (error: AdminPropApiError) => {
      // SDD: sdd_04 §2.2 — anti-enumeration: mismo mensaje para "no existe" y "password incorrecta"
      // error.code === 'ACCOUNT_LOCKED' tras 5 intentos fallidos en 10 min (sdd_04 §2.5)
      setState({ kind: 'error', code: error.code, message: error.message })
    },
  })

  return { state, login: mutation.mutate }
}
```

#### Activación de cuenta vía invitación (sdd_03 §1)

```typescript
// src/modules/auth/pages/AcceptInvitationPage.tsx
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { AcceptInvitationForm } from '../components/AcceptInvitationForm'
import { TokenExpiredState, TokenInvalidState, TokenUsedState } from '../components/InvitationStates'

export function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => authApi.getInvitation(token),
    retry: false,   // no reintentar 422 (expirado, usado)
  })

  if (isLoading) return <Spinner />

  if (isError) {
    const code = error?.code
    if (code === 'INVITATION_EXPIRED') return <TokenExpiredState />
    if (code === 'INVITATION_ALREADY_ACCEPTED') return <TokenUsedState />
    if (code === 'INVITATION_NOT_FOUND') return <TokenInvalidState />
    return <ErrorStateByCode error={error} />
  }

  return <AcceptInvitationForm invitation={data.data} token={token} />
}
```

#### Polling de jobs async (liquidaciones, cobros masivos)

`sdd_03` indica `202 Accepted` + polling para operaciones largas. El frontend polea el detail hasta que el estado cambie.

```typescript
// src/modules/settlements/pages/CalculateSettlementPage.tsx
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { settlementsApi } from '@/api/settlements.api'
import { useSettlementStatus } from '../hooks/useSettlementStatus'

export function CalculateSettlementPage() {
  const [settlementId, setSettlementId] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: settlementsApi.calculate,
    onSuccess: (response) => setSettlementId(response.data.id),
  })

  const { data: settlementDetail } = useSettlementStatus(settlementId ?? '')
  const status = settlementDetail?.data?.status

  if (!settlementId) return <CalculateSettlementForm onSubmit={createMutation.mutate} loading={createMutation.isPending} />

  if (status === 'pending' || status === 'processing') {
    return <ProcessingState settlementId={settlementId} />
  }

  if (status === 'completed') {
    return <SuccessState settlementId={settlementId} result={settlementDetail.data} />
  }

  if (status === 'failed') {
    return <ProcessingFailedState settlementId={settlementId} />
  }

  return <Spinner />
}
```

#### Wizard multipaso (liquidación mensual)

Estado del wizard persistente en Zustand para sobrevivir cambios de página:

```typescript
// src/modules/settlements/settlement-wizard/state.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Step = 'select_period' | 'select_properties' | 'apply_index' | 'review' | 'confirmation'

type SettlementWizardState = {
  wizard_token: string | null
  current_step: Step
  completed_steps: Step[]
  period_id?: string
  property_ids?: string[]
  set_wizard_token: (token: string) => void
  advance_to: (step: Step, data?: Record<string, unknown>) => void
  reset: () => void
}

export const useSettlementWizard = create<SettlementWizardState>()(
  persist(
    (set) => ({
      wizard_token: null,
      current_step: 'select_period',
      completed_steps: [],
      set_wizard_token: (token) => set({ wizard_token: token }),
      advance_to: (step, data) => set((s) => ({
        current_step: step,
        completed_steps: [...new Set([...s.completed_steps, s.current_step])],
        ...(data ?? {}),
      })),
      reset: () => set({ wizard_token: null, current_step: 'select_period', completed_steps: [] }),
    }),
    { name: 'adminprop:settlement-wizard' },
  ),
)
```

### Manejo de FA (flujos alternativos) — uno por estado, no catch genérico

Cada FA del SDD merece tratamiento explícito. NO usar un mensaje genérico de error.

```typescript
// src/modules/auth/components/InvitationStates.tsx
import { FormattedMessage } from 'react-intl'

export function TokenExpiredState() {
  return (
    <div role="alert">
      <h2><FormattedMessage id="invitation.expired.title" defaultMessage="Esta invitación ha expirado" /></h2>
      <p>
        <FormattedMessage
          id="invitation.expired.body"
          defaultMessage="Las invitaciones tienen una validez de 72 horas. Por favor solicitá al administrador que te reenvíe la invitación."
        />
      </p>
    </div>
  )
}

export function TokenUsedState() {
  return (
    <div role="alert">
      <h2><FormattedMessage id="invitation.used.title" defaultMessage="Esta invitación ya fue usada" /></h2>
      <Link to="/login">Ir al login</Link>
    </div>
  )
}
```

### Mensajes de seguridad — usar los textos EXACTOS del SDD

```typescript
// src/modules/auth/components/LoginError.tsx
import { FormattedMessage } from 'react-intl'

export function LoginError() {
  // SDD: sdd_04 §2.2 + frontend CLAUDE.md §7 — anti-enumeration
  return <FormattedMessage id="auth.login.invalid_credentials" defaultMessage="Credenciales incorrectas." />
}

export function ForgotPasswordConfirm() {
  return (
    <FormattedMessage
      id="auth.forgot.confirm"
      defaultMessage="Si el email está registrado, recibirás instrucciones para restablecer tu contraseña en los próximos minutos."
    />
  )
}
```

### Restricciones de rol — ocultar UI según `permissions[]`

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

```typescript
// Uso: el rol maintenance nunca ve contratos, cobranzas ni liquidaciones —
// sólo órdenes de trabajo asignadas y sus cotizaciones.
<RequirePermission permission="contract:manage" fallback={null}>
  <DeleteContractButton contract={contract} />
</RequirePermission>
```

> Esto es UX (evitar dead-ends). El backend igual enforza con `403 FORBIDDEN` o `404 NOT_FOUND` (cross-tenant/cross-scope, RN-D01).

## Template

Skeleton de un flujo completo:

```typescript
// src/modules/<module>/pages/<Module>Page.tsx
import { useQuery } from '@tanstack/react-query'
import { FormattedMessage } from 'react-intl'
import { Spinner, EmptyState, ErrorStateByCode } from '@/shared/components'
import { <module>Api } from '@/api/<module>.api'

export function <Module>Page() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['<module>'],
    queryFn: () => <module>Api.list(),
    retry: false,
  })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorStateByCode error={error} onRetry={refetch} />
  if (!data?.data?.length) {
    return (
      <EmptyState
        title={<FormattedMessage id="<module>.empty.title" defaultMessage="Sin resultados" />}
        action={/* CTA específica del módulo */}
      />
    )
  }

  return (
    <>
      {/* Listado / detalle / form */}
    </>
  )
}
```

## Checklist pre-commit

- [ ] Los 6 estados del flujo están implementados explícitamente: `idle`, `loading`, `success`, `error`, `expired`, `empty`.
- [ ] Cada FA (flujo alternativo) del SDD tiene un componente o branch dedicado, no un catch genérico.
- [ ] Los mensajes de seguridad usan el **texto exacto del SDD** (anti-enumeration login, forgot-password, recovery codes, etc.).
- [ ] Los wizards multipaso persisten su estado en Zustand `persist` para sobrevivir reloads.
- [ ] Los endpoints async (`202`) tienen polling con `refetchInterval` controlado por el estado del recurso.
- [ ] El polling se detiene cuando el recurso llega a un estado terminal (`completed`, `failed`, etc.).
- [ ] La UI restringida por rol usa `<RequirePermission permission="..."/>`, no checks ad-hoc. El rol `maintenance` nunca ve contratos, cobranzas ni liquidaciones.
- [ ] El test E2E cubre el happy path **+** los FA críticos del SDD.

## Antipatrones

```typescript
// ❌ Simplificar todo a loading/success/error
if (isLoading) return <Spinner />
if (isError) return <p>Error</p>
return <DataView data={data} />

// ✅ Estados explícitos
if (isLoading) return <Spinner />
if (isError) return <ErrorStateByCode error={error} />
if (!data?.data?.length) return <EmptyState ... />
return <DataView data={data} />
```

```typescript
// ❌ Catch genérico para todos los errores
catch (error) { toast.error('Algo salió mal') }

// ✅ Discriminar por error.code
catch (error) {
  if (error.code === 'CONTRACT_OVERLAP') setUiState({ kind: 'contract_overlap', details: error.details })
  else if (error.code === 'PAYMENT_EXCEEDS_CONTRACT_BALANCE') setUiState({ kind: 'balance_exceeded' })
  else setUiState({ kind: 'generic_error', message: error.message })
}
```

```typescript
// ❌ Inventar un mensaje de seguridad
function LoginError({ error }) {
  if (error.code === 'UNAUTHORIZED') return <p>El email no existe en nuestro sistema.</p>   // ¡revela!
}

// ✅ Texto exacto del SDD (anti-enumeration)
function LoginError() {
  return <p>Credenciales incorrectas.</p>
}
```

```typescript
// ❌ Wizard sin persistencia de estado
function SettlementWizardStep3() {
  const [data, setData] = useState({})  // se pierde al recargar
}

// ✅ Wizard con Zustand persist (sobrevive a reload)
const useSettlementWizard = create<State>()(persist(..., { name: 'adminprop:settlement-wizard' }))
```

```typescript
// ❌ Polling sin condición de parada
useQuery({ queryKey: ['settlement', id], refetchInterval: 3000 })

// ✅ Stop polling al llegar a estado terminal
useQuery({
  queryKey: ['settlement', id],
  refetchInterval: (query) => {
    const status = query.state.data?.data?.status
    return (status === 'pending' || status === 'processing') ? 3000 : false
  },
})
```

## Referencias

- `docs/sdd/core/sdd_01_prd.md` §3 — UC-01..UC-N con criterios de aceptación que cada flujo debe satisfacer.
- `docs/sdd/core/sdd_03_api_contracts.md` §1 — `POST /auth/login` con 3 escenarios discriminados por `status`.
- `docs/sdd/core/sdd_03_api_contracts.md` §"Códigos de Error Globales" — cada `error.code` requiere UX dedicada.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 — anti-enumeration: mensajes literales obligatorios.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2b — recovery codes mostrados una sola vez.
- `docs/sdd/features/spec_module_05_liquidaciones.md` — wizard de liquidación mensual.
- Frontend `CLAUDE.md` §5 "Manejo de respuestas HTTP" — tabla de comportamientos por status.
- Frontend `CLAUDE.md` §6 "Flujos de usuario definidos en los SDDs" — estados a manejar por flujo.
- Frontend `CLAUDE.md` §7 "Mensajes específicos requeridos (no inventar)".
- Frontend `CLAUDE.md` §8 "Implementar TODOS los flujos alternativos (FA-XX) definidos en el SDD".

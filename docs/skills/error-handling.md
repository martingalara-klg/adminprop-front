# error-handling (frontend)

## Cuándo leer este skill

Leer **antes de**:

- Mostrar un mensaje de error en UI.
- Configurar el handler global de errores (axios interceptor + ErrorBoundary).
- Mapear un `error.code` del backend a una experiencia de usuario.
- Decidir cuándo mostrar un toast, un inline error, una modal o redirigir.

## Stack relevante

| Item | Valor | Fuente |
|---|---|---|
| Formato de error consumido | **CUSTOM** `{ "error": { "code", "message", "field", "details" } }` (NO RFC 7807) | `sdd_03` §"Formato de respuesta" |
| Discriminador | `error.code` (sólo) | frontend `CLAUDE.md` §5 |
| Catálogo de códigos | `sdd_03` §"Códigos de Error Globales" + secciones de cada endpoint | `sdd_03` |
| Mensajes literales obligatorios | Anti-enumeration, recovery codes, etc. | frontend `CLAUDE.md` §7 |
| ErrorBoundary | React 18 ErrorBoundary + Sentry breadcrumbs | frontend `CLAUDE.md` §8 |
| i18n | react-intl | frontend `CLAUDE.md` §3 |

## SDDs de referencia

- `docs/sdd/core/sdd_03_api_contracts.md` §"Formato de respuesta" — formato custom.
- `docs/sdd/core/sdd_03_api_contracts.md` §"Códigos de Error Globales" — catálogo.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 + §2.2a — anti-enumeration en login y forgot-password.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.5 — `Retry-After` en 429.
- Frontend `CLAUDE.md` §5 "Manejo de respuestas HTTP" — tabla por status code.
- Frontend `CLAUDE.md` §7 "Mensajes específicos requeridos (no inventar)".

## El patrón

### Mapeo `error.code` → UX

| Nivel | UX | Cuándo |
|---|---|---|
| **Field-level** | Inline error debajo del input | `VALIDATION_ERROR` con `error.field`, `PASSWORD_POLICY_VIOLATION` |
| **Inline alert** | Banner dentro del componente activo | Errores de negocio recuperables: `PERIOD_LOCKED`, `LAST_OWNER_REQUIRED`, `PAYMENT_EXCEEDS_CONTRACT_BALANCE` |
| **Toast** | Notificación efímera abajo/arriba derecha | Errores transversales: `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`, `INDEX_SERVICE_UNAVAILABLE` |
| **Page-level** | Reemplaza el contenido principal | `NOT_FOUND`, `FORBIDDEN`, `ACCOUNT_LOCKED`, `FEATURE_NOT_ACTIVATED`, `INVITATION_EXPIRED` |

### Catálogo de mensajes localizables

```typescript
// src/shared/i18n/messages/error-codes.es-AR.ts
import { defineMessages } from 'react-intl'

export const errorMessages = defineMessages({
  // Globales
  VALIDATION_ERROR: { id: 'error.VALIDATION_ERROR', defaultMessage: 'Algunos campos tienen errores. Revisalos e intentá nuevamente.' },
  UNAUTHORIZED: { id: 'error.UNAUTHORIZED', defaultMessage: 'Tu sesión expiró. Por favor iniciá sesión nuevamente.' },
  FORBIDDEN: { id: 'error.FORBIDDEN', defaultMessage: 'No tenés permiso para realizar esta acción.' },
  NOT_FOUND: { id: 'error.NOT_FOUND', defaultMessage: 'No encontramos lo que buscás.' },
  CONFLICT: { id: 'error.CONFLICT', defaultMessage: 'Hay un conflicto con el estado actual.' },
  RATE_LIMIT_EXCEEDED: { id: 'error.RATE_LIMIT_EXCEEDED', defaultMessage: 'Demasiadas solicitudes. Esperá unos segundos.' },
  INTERNAL_ERROR: { id: 'error.INTERNAL_ERROR', defaultMessage: 'Ocurrió un error inesperado. El equipo fue notificado.' },

  // Específicos por dominio (sdd_03 §"Códigos de Error Globales")
  ACCOUNT_LOCKED: { id: 'error.ACCOUNT_LOCKED', defaultMessage: 'Tu cuenta está bloqueada por 30 minutos por intentos fallidos.' },
  MFA_INVALID_CODE: { id: 'error.MFA_INVALID_CODE', defaultMessage: 'El código TOTP es incorrecto o expiró.' },
  MFA_TOKEN_INVALID: { id: 'error.MFA_TOKEN_INVALID', defaultMessage: 'La sesión de MFA expiró. Volvé a iniciar sesión.' },
  PERIOD_LOCKED: { id: 'error.PERIOD_LOCKED', defaultMessage: 'El período está bloqueado y no acepta modificaciones.' },
  PERIOD_OVERLAP: { id: 'error.PERIOD_OVERLAP', defaultMessage: 'El rango se solapa con un período existente.' },
  INVALID_STATUS_TRANSITION: { id: 'error.INVALID_STATUS_TRANSITION', defaultMessage: 'No se puede cambiar el estado desde el estado actual.' },
  ENTITY_HAS_DEPENDENCIES: { id: 'error.ENTITY_HAS_DEPENDENCIES', defaultMessage: 'No se puede eliminar: hay registros que dependen de este recurso.' },

  FEATURE_NOT_ACTIVATED: { id: 'error.FEATURE_NOT_ACTIVATED', defaultMessage: 'El módulo solicitado no está activado. El owner debe completar el wizard.' },
  WIZARD_INCOMPLETE: { id: 'error.WIZARD_INCOMPLETE', defaultMessage: 'El wizard tiene pasos pendientes.' },

  INDEX_SERVICE_UNAVAILABLE: { id: 'error.INDEX_SERVICE_UNAVAILABLE', defaultMessage: 'Servicio de índices no disponible (BCRA/INDEC). Reintentá en unos minutos.' },
  INDEX_VALUE_NOT_FOUND: { id: 'error.INDEX_VALUE_NOT_FOUND', defaultMessage: 'No se encontró el valor del índice para el período solicitado.' },
  PAYMENT_EXCEEDS_CONTRACT_BALANCE: { id: 'error.PAYMENT_EXCEEDS_CONTRACT_BALANCE', defaultMessage: 'El monto del cobro excede el saldo pendiente del contrato.' },

  INVITATION_NOT_FOUND: { id: 'error.INVITATION_NOT_FOUND', defaultMessage: 'Invitación no encontrada.' },
  INVITATION_EXPIRED: { id: 'error.INVITATION_EXPIRED', defaultMessage: 'La invitación expiró. Solicitá una nueva al administrador.' },
  INVITATION_ALREADY_ACCEPTED: { id: 'error.INVITATION_ALREADY_ACCEPTED', defaultMessage: 'La invitación ya fue usada. Iniciá sesión con tus credenciales.' },
  USER_ALREADY_MEMBER: { id: 'error.USER_ALREADY_MEMBER', defaultMessage: 'El email ya es miembro de la organización.' },
  LAST_OWNER_REQUIRED: { id: 'error.LAST_OWNER_REQUIRED', defaultMessage: 'Debe quedar al menos un owner activo. Designá otro owner antes.' },
  INVITATION_PENDING_EXISTS: { id: 'error.INVITATION_PENDING_EXISTS', defaultMessage: 'Ya hay una invitación pendiente para ese email.' },
  ROLE_NOT_FOUND: { id: 'error.ROLE_NOT_FOUND', defaultMessage: 'El rol seleccionado no existe en esta organización.' },

  MAINTENANCE_WORK_ORDER_NOT_ASSIGNED: { id: 'error.MAINTENANCE_WORK_ORDER_NOT_ASSIGNED', defaultMessage: 'No tenés acceso a esa orden de trabajo.' },
  WORK_ORDER_ALREADY_CLOSED: { id: 'error.WORK_ORDER_ALREADY_CLOSED', defaultMessage: 'La orden de trabajo ya está cerrada.' },

  DELETION_ALREADY_REQUESTED: { id: 'error.DELETION_ALREADY_REQUESTED', defaultMessage: 'Ya hay una solicitud de eliminación pendiente.' },

  // Fallback
  __FALLBACK__: { id: 'error.__FALLBACK__', defaultMessage: 'Ocurrió un error. Por favor intentá nuevamente.' },
})
```

### Hook utilitario para resolver el mensaje

```typescript
// src/api/useErrorMessage.ts
import { useIntl } from 'react-intl'
import { AdminPropApiError } from './errors'
import { errorMessages } from '@/shared/i18n/messages/error-codes.es-AR'

export function useErrorMessage(error: unknown): string {
  const intl = useIntl()

  if (error instanceof AdminPropApiError) {
    const descriptor = (errorMessages as Record<string, any>)[error.code]
    if (descriptor) {
      return intl.formatMessage(descriptor)
    }
    return error.message || intl.formatMessage(errorMessages.__FALLBACK__)
  }

  if (error instanceof Error) {
    return error.message
  }

  return intl.formatMessage(errorMessages.__FALLBACK__)
}
```

### Componente discriminador por código

```typescript
// src/shared/components/ErrorStateByCode.tsx
import { AdminPropApiError } from '@/api/errors'
import { useErrorMessage } from '@/api/useErrorMessage'

import {
  PageLevelError, InlineError, RetryableError,
  AccountLockedState, RateLimitState, FeatureNotActivatedState,
} from './error-states'

type Props = {
  error: unknown
  onRetry?: () => void
}

export function ErrorStateByCode({ error, onRetry }: Props) {
  if (!(error instanceof AdminPropApiError)) {
    return <RetryableError onRetry={onRetry} />
  }

  // 1. Page-level errors
  if (error.code === 'NOT_FOUND') return <PageLevelError variant="not-found" />
  if (error.code === 'FORBIDDEN' || error.code === 'ROLE_REQUIRED') return <PageLevelError variant="forbidden" />
  if (error.code === 'FEATURE_NOT_ACTIVATED') return <FeatureNotActivatedState />
  if (error.code === 'ACCOUNT_LOCKED') return <AccountLockedState />
  if (error.code === 'INVITATION_EXPIRED') return <PageLevelError variant="invitation-expired" />

  // 2. Inline errors
  if (error.code === 'PERIOD_LOCKED') return <InlineError code={error.code} details={error.details} />
  if (error.code === 'LAST_OWNER_REQUIRED') return <InlineError code={error.code} />
  if (error.code === 'PAYMENT_EXCEEDS_CONTRACT_BALANCE') return <InlineError code={error.code} details={error.details} />

  // 3. Retryable / transient
  if (error.code === 'INDEX_SERVICE_UNAVAILABLE') return <RetryableError onRetry={onRetry} message={useErrorMessage(error)} />
  if (error.code === 'RATE_LIMIT_EXCEEDED') return <RateLimitState retryAfter={error.details?.retry_after_seconds as number} />

  // 4. Fallback
  return <RetryableError onRetry={onRetry} message={useErrorMessage(error)} />
}
```

### Errores de validación → field-level

```typescript
// src/modules/payments/components/PaymentForm.tsx
import { useMutation } from '@tanstack/react-query'
import { AdminPropApiError } from '@/api/errors'
import { paymentsApi } from '@/api/payments.api'

export function PaymentForm() {
  const form = useForm({ /* ... */ })

  const mutation = useMutation({
    mutationFn: paymentsApi.create,
    onError: (error: AdminPropApiError) => {
      if (error.code === 'VALIDATION_ERROR' && error.field) {
        form.setError(error.field as any, { type: 'server', message: error.message })
        return
      }
      if (error.code === 'PAYMENT_EXCEEDS_CONTRACT_BALANCE') {
        form.setError('amount', { type: 'server', message: 'El monto excede el saldo pendiente del contrato.' })
        return
      }
      if (error.code === 'PERIOD_LOCKED') {
        form.setError('payment_date', { type: 'server', message: 'Este período está bloqueado.' })
        return
      }
      toast.error(useErrorMessage(error))
    },
  })

  return <form onSubmit={form.handleSubmit(mutation.mutate)}>{/* ... */}</form>
}
```

### Mensajes de seguridad — TEXTOS EXACTOS del SDD

Estos NO se traducen ni se modifican. Vienen literalmente del SDD por razones de seguridad.

```typescript
// src/shared/i18n/messages/security.es-AR.ts
import { defineMessages } from 'react-intl'

export const securityMessages = defineMessages({
  // sdd_04 §2.2 — anti-enumeration login
  'auth.invalid_credentials': {
    id: 'auth.invalid_credentials',
    defaultMessage: 'Credenciales incorrectas.',
  },

  // sdd_03 §1 POST /auth/forgot-password
  'auth.forgot_password_confirm': {
    id: 'auth.forgot_password_confirm',
    defaultMessage: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña en los próximos minutos.',
  },

  // sdd_04 §2.2b
  'mfa.recovery_codes.warning': {
    id: 'mfa.recovery_codes.warning',
    defaultMessage: 'Guardalos en un lugar seguro. Se muestran una única vez y no pueden recuperarse.',
  },

  // JWT con mfa_via=recovery_code
  'mfa.signed_in_via_recovery.banner': {
    id: 'mfa.signed_in_via_recovery.banner',
    defaultMessage: 'Iniciaste sesión con un código de recuperación. Considerá regenerar tus códigos.',
  },
})
```

### Toast para errores transversales

```typescript
// src/shared/components/Toast.tsx (uso)
import { toast } from './toast'

export function showRateLimitToast(retryAfterSeconds: number) {
  toast.warning(
    `Demasiadas solicitudes. Esperá ${retryAfterSeconds} segundos.`,
    { duration: Math.min(retryAfterSeconds * 1000, 10_000) },
  )
}
```

### Sentry breadcrumbs

```typescript
// src/shared/observability/sentry.ts
import * as Sentry from '@sentry/react'
import { AdminPropApiError } from '@/api/errors'

export function reportApiError(error: unknown, context?: Record<string, unknown>) {
  if (error instanceof AdminPropApiError) {
    Sentry.withScope((scope) => {
      scope.setTag('error_code', error.code)
      scope.setTag('http_status', String(error.status))
      if (error.field) scope.setTag('error_field', error.field)
      if (context) scope.setContext('api_call', context)
      Sentry.captureException(error)
    })
  } else {
    Sentry.captureException(error, { extra: context })
  }
}
```

> Incluir el `X-Request-Id` del response header en los breadcrumbs para correlacionar con logs del backend (`sdd_04 §4.6`).

### ErrorBoundary global

```typescript
// src/shared/observability/ErrorBoundary.tsx
import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-8 text-center">
          <h1>Algo salió mal en la interfaz</h1>
          <p>El equipo fue notificado. Por favor recargá la página.</p>
          <button onClick={() => window.location.reload()}>Recargar</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

## Template

Manejo estándar en una mutation:

```typescript
import { useMutation } from '@tanstack/react-query'
import { AdminPropApiError } from '@/api/errors'
import { useErrorMessage } from '@/api/useErrorMessage'
import { toast } from '@/shared/components/Toast'

export function useCreate<Module>() {
  return useMutation({
    mutationFn: <module>Api.create,
    onError: (error: AdminPropApiError) => {
      if (error.code === 'VALIDATION_ERROR' && error.field) {
        return   // el componente lo recibe via formState
      }
      if (['PERIOD_LOCKED', 'PAYMENT_EXCEEDS_CONTRACT_BALANCE'].includes(error.code)) {
        return   // el componente lo discrimina con error.code
      }
      toast.error(useErrorMessage(error))
    },
  })
}
```

Patrón de page con manejo discriminado:

```typescript
export function <Module>Page() {
  const { data, isError, error, refetch } = use<Module>List()

  if (isError) {
    return <ErrorStateByCode error={error} onRetry={refetch} />
  }

  return <<Module>Content data={data!} />
}
```

## Checklist pre-commit

- [ ] Todo error.code consumido está mapeado en `errorMessages` con un descriptor de react-intl.
- [ ] Los mensajes de seguridad (anti-enumeration, MFA) usan el **texto exacto del SDD**.
- [ ] El componente `<ErrorStateByCode>` discrimina por `error.code` antes de mostrar un mensaje genérico.
- [ ] Los errores con `field` se mapean a inline errors del form (`form.setError(error.field, ...)`).
- [ ] El interceptor de Axios maneja `Retry-After` globalmente para 429.
- [ ] El interceptor maneja 401 con refresh transparente; si falla → `/login`.
- [ ] Los errores 5xx muestran un toast genérico + reportan a Sentry con `error_code` como tag.
- [ ] El ErrorBoundary global captura errores de renderizado y los reporta a Sentry.
- [ ] El `X-Request-Id` se incluye en los breadcrumbs de Sentry.
- [ ] `INTERNAL_ERROR` y errores no mapeados caen al fallback genérico.

## Antipatrones

```typescript
// ❌ Mostrar el message crudo del backend (genérico)
toast.error(error.response.data.error.message)

// ✅ Mapear por error.code → mensaje localizado
toast.error(useErrorMessage(error))
```

```typescript
// ❌ Asumir RFC 7807 al parsear el error
const errorBody = response.data
toast.error(errorBody.detail || errorBody.title)

// ✅ Leer el formato custom
if (error instanceof AdminPropApiError) {
  // error.code, error.message, error.field, error.details ya están parseados
}
```

```typescript
// ❌ Inventar mensajes que el SDD declara textuales
function InvalidCredentialsAlert() {
  return <Alert>El email no existe en nuestro sistema.</Alert>
}
// Permite enumeration. Viola sdd_04 §2.2.

// ✅ Texto exacto del SDD
function InvalidCredentialsAlert() {
  return <Alert><FormattedMessage {...securityMessages['auth.invalid_credentials']} /></Alert>
}
```

```typescript
// ❌ Mostrar 403 como 404
catch (error) {
  if (error.status === 403) return <NotFoundPage />
}

// ✅ Diferenciar
catch (error) {
  if (error.code === 'NOT_FOUND') return <NotFoundPage />
  if (error.code === 'FORBIDDEN') return <ForbiddenPage />
}
```

```typescript
// ❌ Tragar el error en un catch sin reportar
try { /* ... */ } catch (error) {}   // silent

// ✅ Reportar a Sentry con contexto
catch (error) {
  reportApiError(error, { feature: 'create-payment', contract_id: contract.id })
  throw error
}
```

## Referencias

- `docs/sdd/core/sdd_03_api_contracts.md` §"Formato de respuesta" — formato custom obligatorio.
- `docs/sdd/core/sdd_03_api_contracts.md` §"Códigos de Error Globales" — catálogo de `error.code` consumido por el frontend.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.2 + §2.2a — mensajes literales anti-enumeration.
- `docs/sdd/core/sdd_04_nonfunctional.md` §2.5 — `Retry-After` en 429.
- `docs/sdd/core/sdd_04_nonfunctional.md` §4.6 — `X-Request-Id` para correlación cross-stack.
- Frontend `CLAUDE.md` §5 "Manejo de respuestas HTTP" — tabla por status code.
- Frontend `CLAUDE.md` §5 "Formato de error esperado" — confirma formato custom.
- Frontend `CLAUDE.md` §7 "Mensajes específicos requeridos (no inventar)".
- Frontend `CLAUDE.md` §8 "Usar los mensajes de error exactos especificados en los SDDs".
- `docs/sdd/_index.md` §4 — anti-enumeration es decisión arquitectónica.

// src/modules/auth/pages/ForgotPasswordPage.tsx
//
// sdd_03 §1: POST /auth/forgot-password -> 200 SIEMPRE (anti-enumeration).
// sdd_04 §2.2a: el texto de confirmacion es LITERAL, exista o no el email,
// y tambien se muestra ante cualquier error de negocio (no revela nada).
// El unico caso que NO usa el texto de confirmacion es RATE_LIMIT_EXCEEDED
// (transversal, sdd_04 §2.5) -- ese sí es visible como tal.
import { Link } from 'react-router-dom'
import { ForgotPasswordForm } from '../components/ForgotPasswordForm'
import { useForgotPasswordFlow } from '../hooks/useForgotPasswordFlow'
import { securityMessages } from '@/shared/i18n/messages/security.es-AR'
import { resolveErrorCodeMessage } from '@/shared/i18n/messages/error-codes.es-AR'
import { AdminPropApiError, mapError } from '@/api/errors'

export function ForgotPasswordPage() {
  const mutation = useForgotPasswordFlow()

  const isRateLimited =
    mutation.isError &&
    (mutation.error instanceof AdminPropApiError
      ? mutation.error.code
      : mapError(mutation.error).code) === 'RATE_LIMIT_EXCEEDED'

  const showConfirmation = mutation.isSuccess || (mutation.isError && !isRateLimited)

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-center text-xl font-semibold">Recuperar contraseña</h1>

      {showConfirmation ? (
        <p role="status" className="text-center text-sm">
          {securityMessages.authForgotPasswordConfirmation}
        </p>
      ) : isRateLimited ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {resolveErrorCodeMessage('RATE_LIMIT_EXCEEDED')}
        </p>
      ) : (
        <ForgotPasswordForm
          onSubmit={(values) => mutation.mutate(values.email)}
          isSubmitting={mutation.isPending}
        />
      )}

      <Link to="/login" className="text-center text-sm text-muted-foreground hover:underline">
        Volver a ingresar
      </Link>
    </div>
  )
}

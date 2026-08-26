// src/modules/auth/pages/ResetPasswordPage.tsx
//
// sdd_03 §1: GET /auth/reset-password/:token -> 200 | 404 | 410
// (RESET_TOKEN_EXPIRED). El "nunca existio / ya usado" cae en el 404
// NOT_FOUND generico (sdd_03 §"Codigos de Error Globales").
import { useSearchParams } from 'react-router-dom'
import { Spinner } from '@/shared/components'
import { TokenStateMessage } from '../components/TokenStateMessage'
import { ResetPasswordForm } from '../components/ResetPasswordForm'
import { useResetPasswordFlow, useResetPasswordToken } from '../hooks/useResetPasswordFlow'
import { AdminPropApiError, mapError } from '@/api/errors'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const tokenQuery = useResetPasswordToken(token)
  const resetMutation = useResetPasswordFlow()

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <TokenStateMessage title="Enlace inválido" linkTo="/forgot-password" linkLabel="Solicitar uno nuevo">
          Este enlace no incluye un token válido. Solicitá uno nuevo.
        </TokenStateMessage>
      </div>
    )
  }

  if (tokenQuery.isLoading) {
    return <Spinner label="Verificando enlace…" />
  }

  if (tokenQuery.isError) {
    const apiError =
      tokenQuery.error instanceof AdminPropApiError ? tokenQuery.error : mapError(tokenQuery.error)

    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        {apiError.code === 'RESET_TOKEN_EXPIRED' ? (
          <TokenStateMessage
            title="El enlace expiró"
            linkTo="/forgot-password"
            linkLabel="Solicitar uno nuevo"
          >
            Los enlaces para restablecer la contraseña son válidos por 1 hora. Solicitá uno nuevo.
          </TokenStateMessage>
        ) : (
          <TokenStateMessage title="Enlace inválido" linkTo="/forgot-password" linkLabel="Solicitar uno nuevo">
            Este enlace ya fue usado o no existe. Solicitá uno nuevo.
          </TokenStateMessage>
        )}
      </div>
    )
  }

  if (resetMutation.isSuccess) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <TokenStateMessage title="Contraseña actualizada" linkTo="/login" linkLabel="Ir a ingresar">
          Tu contraseña fue actualizada correctamente.
        </TokenStateMessage>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-center text-xl font-semibold">Restablecer contraseña</h1>

      <ResetPasswordForm
        email={tokenQuery.data?.data.email ?? ''}
        onSubmit={(values) => resetMutation.mutate({ token, password: values.password })}
        isSubmitting={resetMutation.isPending}
      />

      {resetMutation.isError ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {(resetMutation.error instanceof AdminPropApiError
            ? resetMutation.error
            : mapError(resetMutation.error)
          ).message}
        </p>
      ) : null}
    </div>
  )
}

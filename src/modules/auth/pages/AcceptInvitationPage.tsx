// src/modules/auth/pages/AcceptInvitationPage.tsx
//
// spec_module_00_superadmin.md §"Flujo de Activacion de Cuenta":
// 1. link /accept-invitation?token=<uuid>
// 2. GET /auth/invitation/:token -> email + org (o INVITATION_EXPIRED /
//    INVITATION_NOT_FOUND / INVITATION_ALREADY_ACCEPTED)
// 3. POST /auth/accept-invitation -> CA-00-03 el owner queda logueado.
import { useSearchParams } from 'react-router-dom'
import { Spinner } from '@/shared/components'
import { TokenStateMessage } from '../components/TokenStateMessage'
import { AcceptInvitationForm } from '../components/AcceptInvitationForm'
import { useInvitation } from '../hooks/useInvitation'
import { useAcceptInvitationFlow } from '../hooks/useAcceptInvitationFlow'
import { AdminPropApiError, mapError } from '@/api/errors'

export function AcceptInvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const invitationQuery = useInvitation(token)
  const acceptMutation = useAcceptInvitationFlow()

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <TokenStateMessage title="Enlace inválido" linkTo="/login" linkLabel="Ir a ingresar">
          Este enlace no incluye un token de invitación válido.
        </TokenStateMessage>
      </div>
    )
  }

  if (invitationQuery.isLoading) {
    return <Spinner label="Verificando invitación…" />
  }

  if (invitationQuery.isError) {
    const apiError =
      invitationQuery.error instanceof AdminPropApiError
        ? invitationQuery.error
        : mapError(invitationQuery.error)

    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        {apiError.code === 'INVITATION_EXPIRED' ? (
          <TokenStateMessage title="Esta invitación expiró">
            Las invitaciones tienen una validez de 72 horas. Pedile al administrador que te
            reenvíe la invitación.
          </TokenStateMessage>
        ) : apiError.code === 'INVITATION_ALREADY_ACCEPTED' ? (
          <TokenStateMessage title="Esta invitación ya fue usada" linkTo="/login" linkLabel="Ir a ingresar">
            Ya activaste esta cuenta. Iniciá sesión con tus credenciales.
          </TokenStateMessage>
        ) : (
          <TokenStateMessage title="Invitación no encontrada" linkTo="/login" linkLabel="Ir a ingresar">
            No encontramos esta invitación. Verificá el enlace o pedí uno nuevo.
          </TokenStateMessage>
        )}
      </div>
    )
  }

  if (!invitationQuery.data) {
    return <Spinner label="Verificando invitación…" />
  }

  const invitation = invitationQuery.data.data

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-center text-xl font-semibold">Activar cuenta</h1>

      <AcceptInvitationForm
        email={invitation.email}
        organizationName={invitation.organization_name}
        roleName={invitation.role_name}
        onSubmit={(values) =>
          acceptMutation.mutate({
            token,
            full_name: values.full_name,
            password: values.password,
          })
        }
        isSubmitting={acceptMutation.isPending}
      />

      {acceptMutation.isError ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {(acceptMutation.error instanceof AdminPropApiError
            ? acceptMutation.error
            : mapError(acceptMutation.error)
          ).message}
        </p>
      ) : null}
    </div>
  )
}

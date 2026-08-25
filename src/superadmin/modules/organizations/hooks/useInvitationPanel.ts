// src/superadmin/modules/organizations/hooks/useInvitationPanel.ts
//
// RF-03/RF-04 + CA-00-02: orquesta el panel de invitación del owner.
//
// Decisión de implementación (sin GET dedicado en sdd_03 §2 para consultar
// el estado de la invitación fuera del propio POST de invite/resend): el
// estado "conocido" de la invitación (email + expires_at) vive sólo en la
// respuesta de invite-owner/resend-invitation de ESTA sesión de UI — no
// hay endpoint para rehidratarlo tras un reload. Si el usuario recarga la
// página con una invitación pendiente, el flujo la redescubre mediante el
// error `INVITATION_PENDING_EXISTS` (409) que el propio invite-owner
// devuelve, ofreciendo "reenviar" desde ahí. `expired` se calcula
// client-side comparando `expires_at` contra la hora actual (dato de
// vigencia, no estado opaco del servidor) mientras la invitación es
// "conocida".
import { useState } from 'react'
import { AdminPropApiError, mapError } from '@/api/errors'
import type { InvitationSummary } from '@/api/organizations.api'
import { useInviteOwner } from './useInviteOwner'
import { useResendInvitation } from './useResendInvitation'

export type InvitationPanelState =
  | { kind: 'no_invitation' }
  | { kind: 'pending_unknown' }
  | { kind: 'known'; invitation: InvitationSummary }

export function useInvitationPanel(organizationId: string) {
  const [state, setState] = useState<InvitationPanelState>({ kind: 'no_invitation' })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const inviteMutation = useInviteOwner(organizationId)
  const resendMutation = useResendInvitation(organizationId)

  function inviteOwner(email: string) {
    setErrorMessage(null)
    inviteMutation.mutate(
      { email },
      {
        onSuccess: (response) => setState({ kind: 'known', invitation: response.data }),
        onError: (error: unknown) => {
          const apiError = error instanceof AdminPropApiError ? error : mapError(error)
          if (apiError.code === 'INVITATION_PENDING_EXISTS') {
            setState({ kind: 'pending_unknown' })
            return
          }
          setErrorMessage(apiError.message)
        },
      },
    )
  }

  function resendInvitation() {
    setErrorMessage(null)
    resendMutation.mutate(undefined, {
      onSuccess: (response) => setState({ kind: 'known', invitation: response.data }),
      onError: (error: unknown) => {
        const apiError = error instanceof AdminPropApiError ? error : mapError(error)
        setErrorMessage(apiError.message)
      },
    })
  }

  return {
    state,
    errorMessage,
    isSubmitting: inviteMutation.isPending || resendMutation.isPending,
    inviteOwner,
    resendInvitation,
  }
}

export function isInvitationExpired(invitation: InvitationSummary): boolean {
  return new Date(invitation.expires_at).getTime() < Date.now()
}

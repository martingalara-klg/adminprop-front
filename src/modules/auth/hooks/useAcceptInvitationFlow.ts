// src/modules/auth/hooks/useAcceptInvitationFlow.ts
//
// POST /auth/accept-invitation (sdd_03 §1 + spec_module_00 §"Flujo de
// Activacion"): CA-00-03 "el owner queda logueado con rol owner".
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth.api'
import { buildSession, useSessionStore } from '@/shared/auth/session-store'

export function useAcceptInvitationFlow() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: { token: string; full_name: string; password: string }) =>
      authApi.acceptInvitation(payload),
    onSuccess: (response) => {
      const { user, organization } = response.data
      useSessionStore.getState().setSession(
        buildSession({
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          organization,
        }),
      )
      navigate('/')
    },
  })
}

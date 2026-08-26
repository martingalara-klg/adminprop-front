// src/modules/auth/hooks/useLoginFlow.ts
//
// docs/skills/flow-implementation.md §"Login (sdd_03 §1)" -- estados
// idle/loading/error/organization_selection/authenticated.
//
// sdd_03 §1: "Si el usuario pertenece a multiples orgs, el login incluye
// la seleccion de organizacion (el JWT se emite para UNA org)." El backend
// modela esto con `LoginResponseData.status === 'organization_selection_required'`
// (decision de implementacion documentada en el propio tipo generado) --
// el cliente reintenta el login con `organization_id` elegido.
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { AdminPropApiError, mapError } from '@/api/errors'
import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import type { components } from '@/api/generated/types'

type OrganizationSummary =
  components['schemas']['adminprop__modules__auth__schemas__OrganizationSummary']

export type LoginFlowState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'organization_selection'; organizations: OrganizationSummary[] }
  | { kind: 'authenticated' }
  | { kind: 'account_locked'; retryAfterSeconds: number }
  | { kind: 'error'; code: string; message: string }

export function useLoginFlow() {
  const [state, setState] = useState<LoginFlowState>({ kind: 'idle' })
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string
    password: string
  } | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: { email: string; password: string; organization_id?: string }) =>
      authApi.login(payload),
    onMutate: () => setState({ kind: 'loading' }),
    onSuccess: (response, variables) => {
      const { status, user, organizations, permissions, is_super_admin } = response.data

      if (status === 'organization_selection_required') {
        // sdd_03 §1 v1.6: sin `organization_id` en el body todavía no se
        // emite JWT -- `permissions`/`is_super_admin` vienen `null`, el
        // cliente reintenta el login con la organización elegida.
        setPendingCredentials({ email: variables.email, password: variables.password })
        setState({ kind: 'organization_selection', organizations })
        return
      }

      const activeOrganization = organizations[0]

      if (!user || !activeOrganization || !permissions || is_super_admin == null) {
        // sdd_03 no documenta este caso -- lo tratamos como error generico
        // en vez de asumir un shape no especificado.
        setState({
          kind: 'error',
          code: 'INTERNAL_ERROR',
          message: 'Ocurrió un error inesperado. El equipo fue notificado.',
        })
        return
      }

      useSessionStore.getState().setSession(
        buildSession({
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          organization: activeOrganization,
          permissions,
          isSuperAdmin: is_super_admin,
        }),
      )
      setState({ kind: 'authenticated' })
    },
    onError: (error: unknown) => {
      const apiError = error instanceof AdminPropApiError ? error : mapError(error)

      // sdd_03 §"Codigos de Error Globales": ACCOUNT_LOCKED (403) trae el
      // countdown en details.retry_after_seconds.
      if (apiError.code === 'ACCOUNT_LOCKED') {
        const retryAfterSeconds = Number(apiError.details?.retry_after_seconds ?? 1800)
        setState({ kind: 'account_locked', retryAfterSeconds })
        return
      }

      setState({ kind: 'error', code: apiError.code, message: apiError.message })
    },
  })

  function login(payload: { email: string; password: string }) {
    setPendingCredentials(payload)
    mutation.mutate(payload)
  }

  function selectOrganization(organizationId: string) {
    if (!pendingCredentials) return
    mutation.mutate({ ...pendingCredentials, organization_id: organizationId })
  }

  function reset() {
    setState({ kind: 'idle' })
    setPendingCredentials(null)
  }

  return { state, login, selectOrganization, reset }
}

// src/shared/auth/useSessionBootstrap.ts
//
// issue #21 -- sdd_03 §1 v1.6: "GET /auth/me al montar la app si no hay
// sesión en memoria" -- rehidrata la sesión con los `permissions[]`/
// `is_super_admin`/`role` VIGENTES de la membresía (no el contenido
// cacheado en `localStorage` via Zustand `persist`, que puede haber
// quedado desactualizado si el rol cambió entre sesiones).
//
// - Si ya hay `session` en el store (persistido desde un login previo en
//   este navegador), no se refetchea acá -- el resto de los requests de la
//   app revalidan permisos contra el backend en cada acción real.
// - 401 (sin cookie válida / expirada): `estado deslogueado` -- se limpia
//   cualquier `session` que hubiera quedado persistida, sin mensaje (el
//   usuario simplemente nunca estuvo logueado o su sesión expiró).
// - 403 `MEMBERSHIP_INACTIVE` (membresía desactivada post-emisión del JWT):
//   logout completo (invalida server-side + limpia cache) con el mensaje
//   es-AR del mapa central (`error-codes.es-AR.ts`).
import { useEffect } from 'react'
import { authApi } from '@/api/auth.api'
import { AdminPropApiError, mapError } from '@/api/errors'
import { resolveErrorCodeMessage } from '@/shared/i18n/messages/error-codes.es-AR'
import { logout } from './logout'
import { buildSession, useSessionStore } from './session-store'

export function useSessionBootstrap(): void {
  useEffect(() => {
    if (useSessionStore.getState().session) return

    const controller = new AbortController()

    authApi
      .me({ signal: controller.signal })
      .then((response) => {
        const { user, organization, role, permissions, is_super_admin } = response.data

        useSessionStore.getState().setSession(
          buildSession({
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
            organization: organization ? { id: organization.id, name: organization.name, role: role ?? '' } : null,
            permissions,
            isSuperAdmin: is_super_admin,
          }),
        )
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        const apiError = error instanceof AdminPropApiError ? error : mapError(error)

        if (apiError.code === 'MEMBERSHIP_INACTIVE') {
          void logout(resolveErrorCodeMessage('MEMBERSHIP_INACTIVE'))
          return
        }

        // 401 u otro error inesperado -- estado deslogueado, sin mensaje.
        useSessionStore.getState().clearSession()
      })

    return () => controller.abort()
  }, [])
}

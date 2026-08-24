// src/shared/auth/logout.ts
//
// docs/skills/state-management.md §"Sincronizacion entre stores": al
// logout se limpia TODO -- TanStack Query cache + store de sesion --
// ademas de invalidar el refresh token server-side.
import { queryClient } from '@/shared/queryClient'
import { authApi } from '@/api/auth.api'
import { useSessionStore } from './session-store'

/**
 * @param reason mensaje es-AR opcional a mostrar tras el logout (ej: el
 *   `MEMBERSHIP_INACTIVE` detectado al rehidratar via `GET /auth/me`,
 *   issue #21). Sin reason en el logout manual (botón "Cerrar sesión").
 */
export async function logout(reason?: string): Promise<void> {
  try {
    await authApi.logout()
  } catch {
    // Aun si el request falla (red caida, sesion ya vencida), limpiamos el
    // cliente -- el usuario no debe quedar "logueado" localmente.
  }

  queryClient.clear()
  useSessionStore.getState().clearSession(reason)
}

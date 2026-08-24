// src/shared/auth/logout.ts
//
// docs/skills/state-management.md §"Sincronizacion entre stores": al
// logout se limpia TODO -- TanStack Query cache + store de sesion --
// ademas de invalidar el refresh token server-side.
import { queryClient } from '@/shared/queryClient'
import { authApi } from '@/api/auth.api'
import { useSessionStore } from './session-store'

export async function logout(): Promise<void> {
  try {
    await authApi.logout()
  } catch {
    // Aun si el request falla (red caida, sesion ya vencida), limpiamos el
    // cliente -- el usuario no debe quedar "logueado" localmente.
  }

  queryClient.clear()
  useSessionStore.getState().clearSession()
}

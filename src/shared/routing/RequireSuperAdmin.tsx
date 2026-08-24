import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/shared/auth/useSession'
import { useSessionStore } from '@/shared/auth/session-store'
import { Spinner } from '@/shared/components/Spinner'

/**
 * Guarda de ruta para `/superadmin/*`. issue #6: reemplaza el stub
 * hardcodeado (`isSuperAdmin = false`) por la sesión real de #21
 * (`session.isSuperAdmin` viene de `permissions`/`is_super_admin` reales
 * del JWT, nunca de `role_name` -- CLAUDE.md §4).
 *
 * Mientras el bootstrap de sesión (#21, GET /auth/me) está en curso, no
 * decide todavía -- evita un redirect prematuro a "/" para un Super Admin
 * cuya cookie es válida pero cuyo /auth/me aún no resolvió.
 */
export function RequireSuperAdmin() {
  const isBootstrapping = useSessionStore((s) => s.isBootstrapping)
  const session = useSession()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Cargando sesión..." />
      </div>
    )
  }

  if (!session?.isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

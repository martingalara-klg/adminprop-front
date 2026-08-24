import { Navigate, Outlet } from 'react-router-dom'

/**
 * Guarda de ruta para `/superadmin/*`. La implementación real de sesión
 * (lectura de `is_super_admin` desde el JWT) llega con el cliente HTTP
 * (#4); por ahora bloquea todo el namespace de forma segura por defecto.
 *
 * TODO(#4): reemplazar por `useSession()` real.
 */
export function RequireSuperAdmin() {
  const isSuperAdmin = false

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

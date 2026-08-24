// src/shared/routing/AppLayout.tsx
//
// issue #6 -- shell autenticado real: sidebar con navegación filtrada por
// `permissions[]` (nunca `role_name`, CLAUDE.md §4), header con usuario +
// organización + logout, y los 3 estados de sesión del shell:
//   - bootstrapping (GET /auth/me de #21 en curso)  -> spinner
//   - sin sesión (401, o nunca logueado)             -> redirect a /login
//   - con sesión                                     -> shell + <Outlet/>
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/shared/auth/useSession'
import { useSessionStore } from '@/shared/auth/session-store'
import { Spinner } from '@/shared/components/Spinner'
import { useVisibleNavItems } from './useNavItems'

export function AppLayout() {
  const isBootstrapping = useSessionStore((s) => s.isBootstrapping)
  const session = useSession()
  const navItems = useVisibleNavItems()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Cargando sesión..." />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b px-4 py-4 md:border-b-0 md:border-r">
        <span className="text-lg font-semibold">AdminProp</span>
        <nav aria-label="Navegación principal" className="mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <p className="text-sm font-medium">{session.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {session.organization?.name ?? 'Super Admin'}
            </p>
          </div>
          <NavLink to="/logout" className="text-sm text-destructive hover:underline">
            Cerrar sesión
          </NavLink>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

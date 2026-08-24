// src/shared/auth/session-store.ts
//
// Store de sesion (Zustand + persist) -- docs/skills/tenant-context.md.
// Persiste SOLO metadatos no-sensibles del user/org actual: el JWT vive en
// la cookie HttpOnly (nunca en localStorage/sessionStorage, CLAUDE.md §4).
//
// Razon de persistir: al recargar, mostramos la UI segun rol antes de que
// el primer request confirme la sesion contra el backend. Si la cookie
// expiro, el primer request falla -> el consumidor de #6 fuerza logout.
//
// issue #21 (sdd_03 v1.6 §1): `permissions[]`/`is_super_admin` son AHORA
// valores reales que trae el backend en login/accept-invitation/`/auth/me`
// -- ya no se derivan de un mapa client-side (`role-permissions.ts`,
// eliminado por este issue).
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SessionOrganization = {
  id: string
  name: string
  role: string
}

export type Session = {
  userId: string
  email: string
  fullName: string
  // `null` solo para sesiones de Super Admin (sdd_03 §1 v1.6: el JWT de
  // `/superadmin/*` no lleva `org`/`role`) -- rehidratadas via `/auth/me`.
  organization: SessionOrganization | null
  permissions: string[]
  isSuperAdmin: boolean
}

type SessionState = {
  session: Session | null
  // Mensaje es-AR a mostrar tras un logout forzado (ej: `MEMBERSHIP_INACTIVE`
  // detectado al rehidratar via `/auth/me`). Efímero -- nunca persistido.
  logoutReason: string | null
  // issue #6: el shell (AppLayout / RequireSuperAdmin) necesita distinguir
  // "todavía no sabemos si hay sesión" (bootstrap de #21 en curso) de "no
  // hay sesión" -- si no, un usuario con cookie válida ve un parpadeo a
  // /login antes de que `GET /auth/me` resuelva. Empieza en `true` y nunca
  // se persiste (siempre arranca en `true` en cada carga de la app).
  isBootstrapping: boolean
  setSession: (session: Session) => void
  clearSession: (reason?: string) => void
  finishBootstrap: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      logoutReason: null,
      isBootstrapping: true,
      setSession: (session) => set({ session, logoutReason: null }),
      clearSession: (reason) => set({ session: null, logoutReason: reason ?? null }),
      finishBootstrap: () => set({ isBootstrapping: false }),
    }),
    {
      name: 'adminprop:session',
      partialize: (state) => ({ session: state.session }),
    },
  ),
)

/** Construye el `Session` del store a partir de datos REALES de sdd_03 §1 v1.6. */
export function buildSession(params: {
  userId: string
  email: string
  fullName: string
  organization: SessionOrganization | null
  permissions: string[]
  isSuperAdmin: boolean
}): Session {
  return {
    userId: params.userId,
    email: params.email,
    fullName: params.fullName,
    organization: params.organization,
    permissions: params.permissions,
    isSuperAdmin: params.isSuperAdmin,
  }
}

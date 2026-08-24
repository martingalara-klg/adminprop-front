// src/shared/auth/session-store.ts
//
// Store de sesion (Zustand + persist) -- docs/skills/tenant-context.md.
// Persiste SOLO metadatos no-sensibles del user/org actual: el JWT vive en
// la cookie HttpOnly (nunca en localStorage/sessionStorage, CLAUDE.md §4).
//
// Razon de persistir: al recargar, mostramos la UI segun rol antes de que
// el primer request confirme la sesion contra el backend. Si la cookie
// expiro, el primer request falla -> el consumidor de #6 fuerza logout.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { permissionsForRole } from './role-permissions'

export type SessionOrganization = {
  id: string
  name: string
  role: string
}

export type Session = {
  userId: string
  email: string
  fullName: string
  organization: SessionOrganization
  permissions: string[]
  // sdd_03 §1 no expone `is_super_admin` en el body de /auth/login (el JWT
  // de superadmin ademas no lleva `org`/`role` -- flujo separado, fuera de
  // alcance de #5). Default false; #6 lo resuelve cuando el backend exponga
  // el claim en un response leible por el cliente.
  isSuperAdmin: boolean
}

type SessionState = {
  session: Session | null
  setSession: (session: Session) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'adminprop:session',
      partialize: (state) => ({ session: state.session }),
    },
  ),
)

/** Construye el `Session` del store a partir de un `user` + `organization` de sdd_03 §1. */
export function buildSession(params: {
  userId: string
  email: string
  fullName: string
  organization: SessionOrganization
}): Session {
  return {
    userId: params.userId,
    email: params.email,
    fullName: params.fullName,
    organization: params.organization,
    permissions: permissionsForRole(params.organization.role),
    isSuperAdmin: false,
  }
}

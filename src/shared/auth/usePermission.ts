// src/shared/auth/usePermission.ts
//
// docs/skills/tenant-context.md -- chequeo SIEMPRE por permiso atomico
// (`permissions[]`), nunca por `role_name`.
import { useSessionStore } from './session-store'

export function usePermission(permission: string): boolean {
  return useSessionStore((s) => s.session?.permissions.includes(permission) ?? false)
}

export function usePermissions(permissions: string[]): boolean {
  return useSessionStore((s) => {
    if (!s.session) return false
    return permissions.every((p) => s.session!.permissions.includes(p))
  })
}

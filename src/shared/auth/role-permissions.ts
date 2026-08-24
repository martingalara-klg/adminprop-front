// src/shared/auth/role-permissions.ts
//
// Mapa cliente rol -> permissions[]. DECISION DE IMPLEMENTACION (no
// explicita en sdd_03): el JWT (HttpOnly, no legible por JS) es la unica
// fuente formal de `permissions[]` (sdd_03 §"Convenciones Generales"), pero
// ninguno de los responses de `/auth/login` ni `/auth/accept-invitation`
// expone ese array en el body (ver `LoginResponseData`/`AcceptInvitationResponseData`
// en src/api/generated/types.ts -- solo traen `role` por organizacion).
// `GET /roles` si trae `permissions[]` por rol, pero requiere `role:read`
// (solo `owner`), asi que no sirve para poblar la sesion de `admin`/`maintenance`.
//
// Para no dejar `usePermission()`/`<RequirePermission>` (que consumira #6)
// sin datos, este mapa espeja LITERALMENTE el catalogo cerrado de
// sdd_03 §"Catalogo de Permisos" + §"Resumen de Autorizacion por Recurso"
// y se aplica UNA sola vez, aca, al setear la sesion -- nunca en los puntos
// de uso (que siguen chequeando solo `permissions[]`, nunca `role_name`,
// cumpliendo CLAUDE.md §4 "Permisos").
//
// Si el backend empieza a devolver `permissions[]` en el body de login,
// este mapa se elimina y se usa el valor real del servidor.
export type OrgRole = 'owner' | 'admin' | 'maintenance'

const OWNER_PERMISSIONS = [
  'landlord:read',
  'landlord:manage',
  'landlord:set-commission',
  'renter:read',
  'renter:manage',
  'property:read',
  'property:manage',
  'contract:read',
  'contract:manage',
  'adjustment:apply',
  'rent-period:read',
  'payment:create',
  'payment:void',
  'charge:manage',
  'settlement:read',
  'settlement:generate',
  'settlement:issue',
  'work-order:read',
  'work-order:create',
  'work-order:quote',
  'work-order:approve',
  'work-order:close',
  'work-order:cancel',
  'attachment:manage',
  'user:manage',
  'role:read',
  'organization:configure',
  'audit:read',
  'notification:read',
] as const

const ADMIN_PERMISSIONS = [
  'landlord:read',
  'landlord:manage',
  'renter:read',
  'renter:manage',
  'property:read',
  'property:manage',
  'contract:read',
  'contract:manage',
  'adjustment:apply',
  'rent-period:read',
  'payment:create',
  'payment:void',
  'charge:manage',
  'settlement:read',
  'settlement:generate',
  'settlement:issue',
  'work-order:read',
  'work-order:create',
  'work-order:quote',
  'work-order:approve',
  'work-order:close',
  'work-order:cancel',
  'attachment:manage',
  'audit:read',
  'notification:read',
] as const

const MAINTENANCE_PERMISSIONS = [
  'work-order:read',
  'work-order:quote',
  'work-order:close',
  'attachment:manage',
  'notification:read',
] as const

const ROLE_PERMISSIONS: Record<OrgRole, readonly string[]> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  maintenance: MAINTENANCE_PERMISSIONS,
}

/** Normaliza el `role` string que trae el backend a los 3 roles conocidos. */
export function permissionsForRole(role: string): string[] {
  const normalized = role.toLowerCase() as OrgRole
  return [...(ROLE_PERMISSIONS[normalized] ?? [])]
}

// src/shared/auth/index.ts -- barrel para consumo de otros modulos (#6).
export { useSessionStore, buildSession } from './session-store'
export type { Session, SessionOrganization } from './session-store'
export { useSession } from './useSession'
export { usePermission, usePermissions } from './usePermission'
export { RequirePermission } from './RequirePermission'
export { logout } from './logout'

// src/shared/routing/useNavItems.ts
//
// issue #6 -- deriva los items de navegación visibles a partir de
// `permissions[]` de la sesión activa (NUNCA por `role_name`, CLAUDE.md
// §4). Un usuario `maintenance` sólo tiene `work-order:*` +
// `notification:read` en su sesión real (issue #21) -> sólo ve
// "Mantenimiento" + "Notificaciones" + "Mi cuenta" (permission: null).
import { useSessionStore } from '@/shared/auth/session-store'
import { NAV_ITEMS, type NavItem } from './navigation'

export function useVisibleNavItems(): NavItem[] {
  const permissions = useSessionStore((s) => s.session?.permissions ?? [])
  return NAV_ITEMS.filter(
    (item) => item.permission === null || permissions.includes(item.permission),
  )
}

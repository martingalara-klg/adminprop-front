// src/shared/routing/navigation.ts
//
// issue #6 -- CLAUDE.md §4 "Permisos": la navegación se decide por permiso
// ATÓMICO (`permissions[]` del JWT), nunca por `role_name`. Catálogo de
// permisos y "Resumen de Autorización por Recurso":
// adminprop-back docs/sdd/core/sdd_03_api_contracts.md §Catálogo de
// Permisos / §Resumen de Autorización por Recurso.
//
// Mapeo módulo -> permiso representativo para decidir VISIBILIDAD del ítem
// de navegación (no reemplaza el enforcement real del backend, que valida
// cada endpoint por su propio permiso -- ver sdd_03 §Resumen de
// Autorización). `permission: null` = visible para cualquier sesión
// autenticada (ej: cuenta propia).
export type NavItem = {
  path: string
  label: string
  permission: string | null
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/properties', label: 'Propiedades', permission: 'property:read' },
  { path: '/people', label: 'Personas', permission: 'landlord:read' },
  { path: '/contracts', label: 'Contratos', permission: 'contract:read' },
  { path: '/payments', label: 'Cobranzas', permission: 'rent-period:read' },
  { path: '/settlements', label: 'Liquidaciones', permission: 'settlement:read' },
  { path: '/maintenance', label: 'Mantenimiento', permission: 'work-order:read' },
  { path: '/admin', label: 'Administración', permission: 'user:manage' },
  { path: '/notifications', label: 'Notificaciones', permission: 'notification:read' },
  { path: '/account', label: 'Mi cuenta', permission: null },
]

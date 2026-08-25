import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const AdminUsersPage = lazy(() =>
  import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminRolesPage = lazy(() =>
  import('./pages/AdminRolesPage').then((m) => ({ default: m.AdminRolesPage })),
)
const AdminSettingsPage = lazy(() =>
  import('./pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
)

export const adminRoutes: RouteObject[] = [
  { path: 'admin', element: <AdminUsersPage /> },
  { path: 'admin/roles', element: <AdminRolesPage /> },
  { path: 'admin/settings', element: <AdminSettingsPage /> },
]

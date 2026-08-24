import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const AdminListPage = lazy(() =>
  import('./pages/AdminListPage').then((m) => ({ default: m.AdminListPage })),
)

export const adminRoutes: RouteObject[] = [{ path: 'admin', element: <AdminListPage /> }]

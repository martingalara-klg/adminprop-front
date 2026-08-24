import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const MaintenanceListPage = lazy(() =>
  import('./pages/MaintenanceListPage').then((m) => ({ default: m.MaintenanceListPage })),
)

export const maintenanceRoutes: RouteObject[] = [
  { path: 'maintenance', element: <MaintenanceListPage /> },
]

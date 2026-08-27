// src/modules/maintenance/routes.tsx
//
// spec_module_06_mantenimiento.md: listado (/maintenance, con el alta en
// un modal — issue #48) y ficha del pedido (/maintenance/:workOrderId)
// — code splitting por página (module-structure.md).
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const MaintenanceListPage = lazy(() =>
  import('./pages/MaintenanceListPage').then((m) => ({ default: m.MaintenanceListPage })),
)
const WorkOrderDetailPage = lazy(() =>
  import('./pages/WorkOrderDetailPage').then((m) => ({ default: m.WorkOrderDetailPage })),
)

export const maintenanceRoutes: RouteObject[] = [
  { path: 'maintenance', element: <MaintenanceListPage /> },
  { path: 'maintenance/:workOrderId', element: <WorkOrderDetailPage /> },
]

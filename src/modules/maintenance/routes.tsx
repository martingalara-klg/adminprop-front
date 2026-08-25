// src/modules/maintenance/routes.tsx
//
// spec_module_06_mantenimiento.md: listado (/maintenance), alta
// (/maintenance/new — owner/admin) y ficha del pedido
// (/maintenance/:workOrderId) — code splitting por página
// (module-structure.md). `new` va ANTES de `:workOrderId` para que
// React Router no lo interprete como un id.
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const MaintenanceListPage = lazy(() =>
  import('./pages/MaintenanceListPage').then((m) => ({ default: m.MaintenanceListPage })),
)
const WorkOrderCreatePage = lazy(() =>
  import('./pages/WorkOrderCreatePage').then((m) => ({ default: m.WorkOrderCreatePage })),
)
const WorkOrderDetailPage = lazy(() =>
  import('./pages/WorkOrderDetailPage').then((m) => ({ default: m.WorkOrderDetailPage })),
)

export const maintenanceRoutes: RouteObject[] = [
  { path: 'maintenance', element: <MaintenanceListPage /> },
  { path: 'maintenance/new', element: <WorkOrderCreatePage /> },
  { path: 'maintenance/:workOrderId', element: <WorkOrderDetailPage /> },
]

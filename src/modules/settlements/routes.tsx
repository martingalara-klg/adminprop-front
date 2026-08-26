// src/modules/settlements/routes.tsx
//
// RF-01..RF-05 (issue #14): listado, checklist de cargos del mes,
// wizard de generación y detalle. Rutas literales (`charges`, `new`)
// antes de la dinámica (`:settlementId`) por legibilidad — React Router
// v6 ya prioriza el match más específico independientemente del orden.
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const SettlementsListPage = lazy(() =>
  import('./pages/SettlementsListPage').then((m) => ({ default: m.SettlementsListPage })),
)
const ChargesMonthPage = lazy(() =>
  import('./pages/ChargesMonthPage').then((m) => ({ default: m.ChargesMonthPage })),
)
const SettlementWizardPage = lazy(() =>
  import('./pages/SettlementWizardPage').then((m) => ({ default: m.SettlementWizardPage })),
)
const SettlementDetailPage = lazy(() =>
  import('./pages/SettlementDetailPage').then((m) => ({ default: m.SettlementDetailPage })),
)

export const settlementsRoutes: RouteObject[] = [
  { path: 'settlements', element: <SettlementsListPage /> },
  { path: 'settlements/charges', element: <ChargesMonthPage /> },
  { path: 'settlements/new', element: <SettlementWizardPage /> },
  { path: 'settlements/:settlementId', element: <SettlementDetailPage /> },
]

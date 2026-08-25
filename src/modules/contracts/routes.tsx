// src/modules/contracts/routes.tsx
//
// spec_module_03_contratos.md: listado + alta (/contracts), ficha del
// contrato (/contracts/:contractId) y bandeja de ajustes
// (/contracts/adjustments) — code splitting por página
// (module-structure.md).
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const ContractsListPage = lazy(() =>
  import('./pages/ContractsListPage').then((m) => ({ default: m.ContractsListPage })),
)
const ContractDetailPage = lazy(() =>
  import('./pages/ContractDetailPage').then((m) => ({ default: m.ContractDetailPage })),
)
const AdjustmentsInboxPage = lazy(() =>
  import('./pages/AdjustmentsInboxPage').then((m) => ({ default: m.AdjustmentsInboxPage })),
)

export const contractsRoutes: RouteObject[] = [
  { path: 'contracts', element: <ContractsListPage /> },
  { path: 'contracts/adjustments', element: <AdjustmentsInboxPage /> },
  { path: 'contracts/:contractId', element: <ContractDetailPage /> },
]

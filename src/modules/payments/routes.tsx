// src/modules/payments/routes.tsx
//
// spec_module_04_cobranzas.md: panel del mes (/payments), estado de
// deuda global (/payments/debt) y ficha del período con el flujo de
// cobro (/payments/:rentPeriodId) — code splitting por página
// (module-structure.md).
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const PaymentsListPage = lazy(() =>
  import('./pages/PaymentsListPage').then((m) => ({ default: m.PaymentsListPage })),
)
const DebtPage = lazy(() => import('./pages/DebtPage').then((m) => ({ default: m.DebtPage })))
const RentPeriodDetailPage = lazy(() =>
  import('./pages/RentPeriodDetailPage').then((m) => ({ default: m.RentPeriodDetailPage })),
)

export const paymentsRoutes: RouteObject[] = [
  { path: 'payments', element: <PaymentsListPage /> },
  { path: 'payments/debt', element: <DebtPage /> },
  { path: 'payments/:rentPeriodId', element: <RentPeriodDetailPage /> },
]

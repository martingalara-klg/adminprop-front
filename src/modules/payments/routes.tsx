import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const PaymentsListPage = lazy(() =>
  import('./pages/PaymentsListPage').then((m) => ({ default: m.PaymentsListPage })),
)

export const paymentsRoutes: RouteObject[] = [{ path: 'payments', element: <PaymentsListPage /> }]

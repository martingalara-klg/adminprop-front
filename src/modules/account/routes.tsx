import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const AccountListPage = lazy(() =>
  import('./pages/AccountListPage').then((m) => ({ default: m.AccountListPage })),
)

export const accountRoutes: RouteObject[] = [{ path: 'account', element: <AccountListPage /> }]

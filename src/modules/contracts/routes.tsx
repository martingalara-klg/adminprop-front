import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const ContractsListPage = lazy(() =>
  import('./pages/ContractsListPage').then((m) => ({ default: m.ContractsListPage })),
)

export const contractsRoutes: RouteObject[] = [
  { path: 'contracts', element: <ContractsListPage /> },
]

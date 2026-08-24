import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const SettlementsListPage = lazy(() =>
  import('./pages/SettlementsListPage').then((m) => ({ default: m.SettlementsListPage })),
)

export const settlementsRoutes: RouteObject[] = [
  { path: 'settlements', element: <SettlementsListPage /> },
]

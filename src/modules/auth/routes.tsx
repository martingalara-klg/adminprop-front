import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const AuthListPage = lazy(() =>
  import('./pages/AuthListPage').then((m) => ({ default: m.AuthListPage })),
)

export const authRoutes: RouteObject[] = [{ path: 'auth', element: <AuthListPage /> }]

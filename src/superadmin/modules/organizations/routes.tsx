import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const OrganizationsListPage = lazy(() =>
  import('./pages/OrganizationsListPage').then((m) => ({ default: m.OrganizationsListPage })),
)

export const organizationsRoutes: RouteObject[] = [
  { path: 'organizations', element: <OrganizationsListPage /> },
]

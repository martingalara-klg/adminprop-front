import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const OrganizationsListPage = lazy(() =>
  import('./pages/OrganizationsListPage').then((m) => ({ default: m.OrganizationsListPage })),
)
const OrganizationDetailPage = lazy(() =>
  import('./pages/OrganizationDetailPage').then((m) => ({ default: m.OrganizationDetailPage })),
)

export const organizationsRoutes: RouteObject[] = [
  { path: 'organizations', element: <OrganizationsListPage /> },
  { path: 'organizations/:organizationId', element: <OrganizationDetailPage /> },
]

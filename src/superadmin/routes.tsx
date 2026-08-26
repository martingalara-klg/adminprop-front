import type { RouteObject } from 'react-router-dom'
import { RequireSuperAdmin } from '@/shared/routing/RequireSuperAdmin'
import { organizationsRoutes } from './modules/organizations/routes'
import { auditRoutes } from './modules/audit/routes'

export const superadminRoutes: RouteObject[] = [
  {
    path: 'superadmin',
    element: <RequireSuperAdmin />,
    children: [...organizationsRoutes, ...auditRoutes],
  },
]

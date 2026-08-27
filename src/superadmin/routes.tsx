import { Navigate, type RouteObject } from 'react-router-dom'
import { RequireSuperAdmin } from '@/shared/routing/RequireSuperAdmin'
import { organizationsRoutes } from './modules/organizations/routes'
import { auditRoutes } from './modules/audit/routes'

export const superadminRoutes: RouteObject[] = [
  {
    path: 'superadmin',
    element: <RequireSuperAdmin />,
    children: [
      // issue #45: sin index route, `/superadmin` exacto (destino del
      // login de Super Admin, y de una recarga completa con sesión ya
      // válida) no matcheaba ningún hijo -- el `<Outlet/>` de
      // `RequireSuperAdmin` renderizaba nada (página en blanco, sin error
      // ni redirect). `organizations` es la pantalla principal del portal
      // (spec_module_00_superadmin.md).
      { index: true, element: <Navigate to="organizations" replace /> },
      ...organizationsRoutes,
      ...auditRoutes,
    ],
  },
]

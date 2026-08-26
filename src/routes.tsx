import type { RouteObject } from 'react-router-dom'

import { AppLayout } from '@/shared/routing/AppLayout'
import { HomeRedirect } from '@/shared/routing/HomeRedirect'
import { superadminRoutes } from '@/superadmin/routes'

import { authRoutes } from '@/modules/auth/routes'
import { propertiesRoutes } from '@/modules/properties/routes'
import { peopleRoutes } from '@/modules/people/routes'
import { contractsRoutes } from '@/modules/contracts/routes'
import { paymentsRoutes } from '@/modules/payments/routes'
import { settlementsRoutes } from '@/modules/settlements/routes'
import { maintenanceRoutes } from '@/modules/maintenance/routes'
import { adminRoutes } from '@/modules/admin/routes'
import { notificationsRoutes } from '@/modules/notifications/routes'
import { accountRoutes } from '@/modules/account/routes'

/**
 * Registro central de rutas. Cada módulo aporta su propio `routes.tsx`
 * con `lazy()` para code splitting (ver docs/skills/module-structure.md).
 *
 * `authRoutes` (login/logout/forgot-password/reset-password/accept-
 * invitation, #5) vive FUERA de `AppLayout`: son rutas públicas, sin el
 * shell autenticado. `AppLayout` (#6) resuelve el guard de sesión real
 * (redirect a /login sin sesión) y `HomeRedirect` (#6) decide "/" según
 * el primer módulo al que el usuario tiene permiso.
 */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // issue #6: redirige "/" al primer módulo de negocio visible para la
      // sesión activa (permissions[] real, ver src/shared/routing/HomeRedirect.tsx).
      { index: true, element: <HomeRedirect /> },
      ...propertiesRoutes,
      ...peopleRoutes,
      ...contractsRoutes,
      ...paymentsRoutes,
      ...settlementsRoutes,
      ...maintenanceRoutes,
      ...adminRoutes,
      ...notificationsRoutes,
      ...accountRoutes,
    ],
  },
  ...authRoutes,
  ...superadminRoutes,
]

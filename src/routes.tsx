import type { RouteObject } from 'react-router-dom'

import { AppLayout } from '@/shared/routing/AppLayout'
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
 */
export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Placeholder de Fase 0: renderiza directamente el primer módulo del
      // roadmap en "/" (evita <Navigate> del data router — su navigate()
      // depende de fetch/AbortSignal, incompatible con jsdom en Vitest).
      // La redirección real de "/" según sesión/rol llega con auth (#5).
      { index: true, element: propertiesRoutes[0]?.element },
      ...authRoutes,
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
  ...superadminRoutes,
]

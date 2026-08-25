// src/modules/people/routes.tsx
//
// spec_module_02_personas.md: propietarios (/people, /people/landlords/:id)
// e inquilinos (/people/renters, /people/renters/:id) — dos ABM dentro
// del mismo módulo, code splitting por página (module-structure.md).
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const LandlordsListPage = lazy(() =>
  import('./pages/LandlordsListPage').then((m) => ({ default: m.LandlordsListPage })),
)
const LandlordDetailPage = lazy(() =>
  import('./pages/LandlordDetailPage').then((m) => ({ default: m.LandlordDetailPage })),
)
const RentersListPage = lazy(() =>
  import('./pages/RentersListPage').then((m) => ({ default: m.RentersListPage })),
)
const RenterDetailPage = lazy(() =>
  import('./pages/RenterDetailPage').then((m) => ({ default: m.RenterDetailPage })),
)

export const peopleRoutes: RouteObject[] = [
  { path: 'people', element: <LandlordsListPage /> },
  { path: 'people/landlords/:landlordId', element: <LandlordDetailPage /> },
  { path: 'people/renters', element: <RentersListPage /> },
  { path: 'people/renters/:renterId', element: <RenterDetailPage /> },
]

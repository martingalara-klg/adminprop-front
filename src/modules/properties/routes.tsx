// src/modules/properties/routes.tsx
//
// spec_module_01_propiedades.md: listado + alta (/properties) y ficha
// consolidada (/properties/:propertyId) — code splitting por página
// (module-structure.md).
import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const PropertiesListPage = lazy(() =>
  import('./pages/PropertiesListPage').then((m) => ({ default: m.PropertiesListPage })),
)
const PropertyDetailPage = lazy(() =>
  import('./pages/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage })),
)

export const propertiesRoutes: RouteObject[] = [
  { path: 'properties', element: <PropertiesListPage /> },
  { path: 'properties/:propertyId', element: <PropertyDetailPage /> },
]

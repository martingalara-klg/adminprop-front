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
// issue #99 (back) / #49 (front): ABM del catálogo de barrios — subruta
// del módulo (declarada antes de ':propertyId' para que no la capture el
// param dinámico).
const NeighborhoodsPage = lazy(() =>
  import('./pages/NeighborhoodsPage').then((m) => ({ default: m.NeighborhoodsPage })),
)

export const propertiesRoutes: RouteObject[] = [
  { path: 'properties', element: <PropertiesListPage /> },
  { path: 'properties/neighborhoods', element: <NeighborhoodsPage /> },
  { path: 'properties/:propertyId', element: <PropertyDetailPage /> },
]

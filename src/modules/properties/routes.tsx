import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const PropertiesListPage = lazy(() =>
  import('./pages/PropertiesListPage').then((m) => ({ default: m.PropertiesListPage })),
)

export const propertiesRoutes: RouteObject[] = [
  { path: 'properties', element: <PropertiesListPage /> },
]

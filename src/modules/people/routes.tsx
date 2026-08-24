import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const PeopleListPage = lazy(() =>
  import('./pages/PeopleListPage').then((m) => ({ default: m.PeopleListPage })),
)

export const peopleRoutes: RouteObject[] = [{ path: 'people', element: <PeopleListPage /> }]

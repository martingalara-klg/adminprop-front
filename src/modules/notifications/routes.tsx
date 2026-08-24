import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const NotificationsListPage = lazy(() =>
  import('./pages/NotificationsListPage').then((m) => ({ default: m.NotificationsListPage })),
)

export const notificationsRoutes: RouteObject[] = [
  { path: 'notifications', element: <NotificationsListPage /> },
]

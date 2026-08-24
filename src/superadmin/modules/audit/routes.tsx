import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const AuditListPage = lazy(() =>
  import('./pages/AuditListPage').then((m) => ({ default: m.AuditListPage })),
)

export const auditRoutes: RouteObject[] = [{ path: 'audit', element: <AuditListPage /> }]

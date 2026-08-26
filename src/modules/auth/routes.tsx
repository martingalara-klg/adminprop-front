import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

// Rutas publicas de auth -- viven FUERA del shell autenticado (AppLayout),
// como rutas de nivel raiz en src/routes.tsx (docs/prompts/session-start.md
// tarea #5: "Las rutas publicas de auth van fuera del shell autenticado").
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const LogoutPage = lazy(() =>
  import('./pages/LogoutPage').then((m) => ({ default: m.LogoutPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const AcceptInvitationPage = lazy(() =>
  import('./pages/AcceptInvitationPage').then((m) => ({ default: m.AcceptInvitationPage })),
)

export const authRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/logout', element: <LogoutPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/accept-invitation', element: <AcceptInvitationPage /> },
]

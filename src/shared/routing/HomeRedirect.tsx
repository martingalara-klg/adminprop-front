// src/shared/routing/HomeRedirect.tsx
//
// issue #6 -- resuelve la ruta índice `/`. #5 dejó explícitamente esta
// redirección para el shell (ver comentario histórico en src/routes.tsx).
// Vive DENTRO de `AppLayout` (ver src/routes.tsx), por lo que sólo se
// monta cuando ya hay sesión y el bootstrap terminó -- acá sólo resta
// elegir el primer módulo de negocio al que el usuario tiene acceso.
// `/account` (permission: null) siempre está en `NAV_ITEMS`, así que
// `navItems[0]` nunca es `undefined` para una sesión autenticada.
import { Navigate } from 'react-router-dom'
import { useVisibleNavItems } from './useNavItems'

export function HomeRedirect() {
  const navItems = useVisibleNavItems()
  return <Navigate to={navItems[0]?.path ?? '/account'} replace />
}

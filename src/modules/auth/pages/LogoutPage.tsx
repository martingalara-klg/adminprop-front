// src/modules/auth/pages/LogoutPage.tsx
//
// Flujo de logout (issue #5): invalida el refresh token server-side,
// limpia el store de sesion + cache de TanStack Query, y redirige a
// /login. No hay confirmacion adicional en el SDD -- se ejecuta al montar.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/shared/components'
import { logout } from '@/shared/auth/logout'

export function LogoutPage() {
  const navigate = useNavigate()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    logout().finally(() => navigate('/login', { replace: true }))
  }, [navigate])

  return <Spinner label="Cerrando sesión…" />
}

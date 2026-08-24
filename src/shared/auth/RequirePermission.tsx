// src/shared/auth/RequirePermission.tsx
import type { ReactNode } from 'react'
import { usePermission } from './usePermission'

type Props = {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

/** Oculta UI segun `permissions[]` del JWT -- consumido por #6 (shell/nav). */
export function RequirePermission({ permission, children, fallback = null }: Props) {
  const has = usePermission(permission)
  if (!has) return <>{fallback}</>
  return <>{children}</>
}

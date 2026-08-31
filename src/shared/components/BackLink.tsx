// src/shared/components/BackLink.tsx
//
// Issue #64 (ronda feedback #3, PO): ninguna ficha tenía forma de volver
// al listado. Componente compartido para el link "← Volver a <listado>"
// arriba del título en todas las páginas de detalle. Navega SIEMPRE al
// listado explícito que corresponde (nunca `history.back()` a ciegas —
// si se llegó a la ficha desde otro lado, `history.back()` no volvería
// al listado esperado).
import { Link, type LinkProps } from 'react-router-dom'

import { cn } from '@/shared/utils/cn'

export interface BackLinkProps extends Omit<LinkProps, 'children'> {
  label: string
}

export function BackLink({ label, className, ...props }: BackLinkProps) {
  return (
    <Link
      className={cn(
        'inline-flex w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">←</span>
      <span>Volver a {label}</span>
    </Link>
  )
}

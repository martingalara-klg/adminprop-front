// src/modules/auth/components/TokenStateMessage.tsx
//
// Contenedor visual generico para los estados alternativos de flujos con
// token (invitacion / reset password) -- docs/skills/flow-implementation.md
// §"Manejo de FA -- uno por estado, no catch generico".
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  children: ReactNode
  linkTo?: string
  linkLabel?: string
}

export function TokenStateMessage({ title, children, linkTo, linkLabel }: Props) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{children}</p>
      {linkTo ? (
        <Link to={linkTo} className="text-sm text-primary hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}

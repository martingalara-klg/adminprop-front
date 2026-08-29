// src/shared/components/ui/tabs.tsx
//
// Issue #64 (ronda feedback #3, PO): componente compartido `Tabs`
// (shadcn/ui, patrón manual como `dialog.tsx`/`button.tsx` — copiado al
// repo, no instalado vía `shadcn add`). A diferencia del Tabs "clásico"
// de shadcn (basado en `@radix-ui/react-tabs`, valor controlado en
// memoria), acá cada tab es una ruta real: los selectores que reemplaza
// (Propietarios/Inquilinos, Propiedades/Barrios) ya vivían como
// navegación (`NavLink`) para que la tab activa y el contenido persistan
// en la URL — necesario para que `BackLink` regrese a la tab correcta.
// Se construye sobre `NavLink` en lugar de agregar `@radix-ui/react-tabs`
// como dependencia nueva solo para reproducir lo que `NavLink` ya
// resuelve (routing + estado activo). No usa los roles ARIA
// `tablist`/`tab` (ese patrón espera navegación con flechas y un
// `tabpanel` asociado, que acá no existe — cada "tab" es una página
// distinta): se deja como navegación semántica estándar (`nav` + `a`),
// que ya es accesible por lectores de pantalla sin implementar el
// widget de ARIA Tabs completo.
import * as React from 'react'
import { NavLink, type NavLinkProps } from 'react-router-dom'

import { cn } from '@/shared/utils/cn'

function Tabs({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn('flex items-center gap-4 border-b border-border', className)} {...props} />
  )
}
Tabs.displayName = 'Tabs'

const TabsLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, children, ...props }, ref) => (
    <NavLink
      ref={ref}
      className={(state) =>
        cn(
          '-mb-px border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
          state.isActive && 'border-primary text-foreground',
          typeof className === 'function' ? className(state) : className,
        )
      }
      {...props}
    >
      {children}
    </NavLink>
  ),
)
TabsLink.displayName = 'TabsLink'

export { Tabs, TabsLink }

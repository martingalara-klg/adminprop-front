// src/modules/people/components/PeopleTabsNav.tsx
//
// spec_module_02_personas.md: "propietarios" e "inquilinos" son dos ABM
// distintos dentro del mismo módulo — navegación simple entre ambos
// listados (sin lógica de permisos acá; cada página gatea su propio
// contenido con usePermission).
import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/utils/cn'

export function PeopleTabsNav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-md px-3 py-1.5 text-sm font-medium',
      isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <nav className="flex gap-2" aria-label="Personas">
      <NavLink to="/people" end className={linkClass}>
        Propietarios
      </NavLink>
      <NavLink to="/people/renters" className={linkClass}>
        Inquilinos
      </NavLink>
    </nav>
  )
}

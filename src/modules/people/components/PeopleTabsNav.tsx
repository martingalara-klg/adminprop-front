// src/modules/people/components/PeopleTabsNav.tsx
//
// spec_module_02_personas.md: "propietarios" e "inquilinos" son dos ABM
// distintos dentro del mismo módulo — navegación simple entre ambos
// listados (sin lógica de permisos acá; cada página gatea su propio
// contenido con usePermission).
//
// Issue #64 (ronda feedback #3, PO): el selector quedaba a la altura del
// título ("flotaba" y se perdía). Ahora es el componente compartido
// `Tabs`/`TabsLink` (src/shared/components/ui/tabs.tsx), ubicado debajo
// del título "Personas" — ver LandlordsListPage/RentersListPage.
import { Tabs, TabsLink } from '@/shared/components'

export function PeopleTabsNav() {
  return (
    <Tabs aria-label="Personas">
      <TabsLink to="/people" end>
        Propietarios
      </TabsLink>
      <TabsLink to="/people/renters">Inquilinos</TabsLink>
    </Tabs>
  )
}

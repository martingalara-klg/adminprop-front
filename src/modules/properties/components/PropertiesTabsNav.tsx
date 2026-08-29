// src/modules/properties/components/PropertiesTabsNav.tsx
//
// Issue #64 (ronda feedback #3, PO): "selector equivalente" al de
// Personas — el link "Barrios" flotaba al lado del título "Propiedades".
// Mismo componente compartido `Tabs`/`TabsLink` que `PeopleTabsNav`,
// debajo del título, para navegar entre el listado de propiedades y el
// catálogo de barrios (misma sección del módulo).
import { Tabs, TabsLink } from '@/shared/components'

export function PropertiesTabsNav() {
  return (
    <Tabs aria-label="Propiedades">
      <TabsLink to="/properties" end>
        Propiedades
      </TabsLink>
      <TabsLink to="/properties/neighborhoods">Barrios</TabsLink>
    </Tabs>
  )
}

// src/modules/people/components/LandlordPropertiesList.tsx
//
// RF-02: "Datos + listado de sus propiedades (con estado y contrato
// vigente)". `LandlordPropertySummary` viene embebido en `LandlordDetail`
// (no requiere un request aparte) — `active_contract` queda en `null`
// hasta que exista el módulo `contracts` (fuera del scope de #9).
import type { LandlordPropertySummary } from '@/api/people.api'
import { EmptyState, ContractStatusBadge } from '@/shared/components'
import { propertyTypeLabel } from '@/shared/utils/propertyType'

type Props = { properties: LandlordPropertySummary[] }

export function LandlordPropertiesList({ properties }: Props) {
  if (properties.length === 0) {
    return <EmptyState title="Este propietario no tiene propiedades registradas" />
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Dirección</th>
          <th className="py-2 pr-4 font-medium">Tipo</th>
          <th className="py-2 font-medium">Estado</th>
        </tr>
      </thead>
      <tbody>
        {properties.map((property) => (
          <tr key={property.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{property.address}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {propertyTypeLabel(property.property_type)}
            </td>
            <td className="py-2">
              <ContractStatusBadge status={property.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

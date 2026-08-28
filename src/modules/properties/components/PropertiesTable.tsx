// src/modules/properties/components/PropertiesTable.tsx
//
// RF-01 + CA-01-01: listado de propiedades — la creada aparece acá.
import { Link } from 'react-router-dom'
import type { PropertySummary } from '@/api/properties.api'
import type { LandlordSummary } from '@/api/people.api'
import { ContractStatusBadge } from '@/shared/components'
import { propertyTypeLabel } from '@/shared/utils/propertyType'

type Props = {
  properties: PropertySummary[]
  landlords: LandlordSummary[]
}

export function PropertiesTable({ properties, landlords }: Props) {
  const landlordNameById = new Map(landlords.map((landlord) => [landlord.id, landlord.name]))

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Dirección</th>
          <th className="py-2 pr-4 font-medium">Propietario</th>
          <th className="py-2 pr-4 font-medium">Barrio</th>
          <th className="py-2 pr-4 font-medium">Tipo</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {properties.map((property) => (
          <tr key={property.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{property.address}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {landlordNameById.get(property.landlord_id) ?? '—'}
            </td>
            {/* issue #99/#49: propiedades legacy preexistentes al catálogo
                de barrios no tienen `neighborhood` embebido — "Sin barrio". */}
            <td className="py-2 pr-4 text-muted-foreground">
              {property.neighborhood?.name ?? 'Sin barrio'}
            </td>
            <td className="py-2 pr-4 text-muted-foreground">
              {propertyTypeLabel(property.property_type)}
            </td>
            <td className="py-2 pr-4">
              <ContractStatusBadge status={property.status} />
            </td>
            <td className="py-2">
              <Link
                to={`/properties/${property.id}`}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver ficha
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

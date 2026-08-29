// src/modules/properties/components/PropertyReadView.tsx
//
// Issue #66: modo lectura de la ficha de propiedad — labels + valores en
// texto plano (sin inputs) mientras la sección no está en edición.
import type { LandlordSummary } from '@/api/people.api'
import type { NeighborhoodDetail } from '@/api/neighborhoods.api'
import type { PropertyDetail } from '@/api/properties.api'
import { propertyTypeLabel } from '@/shared/utils/propertyType'

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  unavailable: 'No disponible',
  rented: 'Alquilada (estado automático — hay un contrato vigente)',
}

type Props = {
  property: PropertyDetail
  landlords: LandlordSummary[]
  neighborhoods: NeighborhoodDetail[]
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  )
}

export function PropertyReadView({ property, landlords, neighborhoods }: Props) {
  const landlordName =
    landlords.find((l) => l.id === property.landlord_id)?.name ?? property.landlord_id
  const neighborhoodName =
    property.neighborhood?.name ??
    neighborhoods.find((n) => n.id === property.neighborhood_id)?.name ??
    'Sin barrio'

  return (
    <div
      className="flex flex-col gap-3 rounded-md border p-4"
      data-testid="property-read-view"
    >
      <Field label="Dirección" value={property.address} />
      <Field label="Propietario" value={landlordName} />
      <Field label="Barrio" value={neighborhoodName} />
      <Field label="Tipo" value={propertyTypeLabel(property.property_type)} />
      <Field label="Estado" value={STATUS_LABELS[property.status] ?? property.status} />
      <Field label="Notas" value={property.notes ?? ''} />
    </div>
  )
}

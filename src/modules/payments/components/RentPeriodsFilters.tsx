// src/modules/payments/components/RentPeriodsFilters.tsx
//
// RF-02: selector de período (`?period=YYYY-MM`, ver el `PeriodSelector`
// compartido — issue #71, movido a shared en #78) + filtros de estado,
// en mora, propiedad, propietario, inquilino. Presentacional puro
// (props in / eventos out, module-structure.md).
import type { PropertySummary } from '@/api/properties.api'
import type { LandlordSummary, RenterDetail } from '@/api/people.api'
import { Label, PeriodSelector } from '@/shared/components'
import type { RentPeriodListFilters } from '@/api/payments.api'

type Props = {
  /** `period` siempre presente: el panel es "del mes" (RF-02). */
  value: RentPeriodListFilters & { period: string }
  properties: PropertySummary[]
  landlords: LandlordSummary[]
  renters: RenterDetail[]
  onChange: (patch: Partial<RentPeriodListFilters>) => void
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

export function RentPeriodsFilters({ value, properties, landlords, renters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <PeriodSelector value={value.period} onChange={(period) => onChange({ period })} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rent-periods-status">Estado</Label>
        <select
          id="rent-periods-status"
          className={SELECT_CLASS}
          value={value.status ?? ''}
          onChange={(event) =>
            onChange({
              status: (event.target.value || undefined) as RentPeriodListFilters['status'],
            })
          }
        >
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="partial">Parcial</option>
          <option value="paid">Pagado</option>
        </select>
      </div>

      <div className="flex items-center gap-2 pb-1.5">
        <input
          id="rent-periods-in-arrears"
          type="checkbox"
          checked={value.in_arrears ?? false}
          onChange={(event) => onChange({ in_arrears: event.target.checked || undefined })}
        />
        <Label htmlFor="rent-periods-in-arrears">Sólo en mora</Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rent-periods-property">Propiedad</Label>
        <select
          id="rent-periods-property"
          className={SELECT_CLASS}
          value={value.property_id ?? ''}
          onChange={(event) => onChange({ property_id: event.target.value || undefined })}
        >
          <option value="">Todas</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.address}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rent-periods-landlord">Propietario</Label>
        <select
          id="rent-periods-landlord"
          className={SELECT_CLASS}
          value={value.landlord_id ?? ''}
          onChange={(event) => onChange({ landlord_id: event.target.value || undefined })}
        >
          <option value="">Todos</option>
          {landlords.map((landlord) => (
            <option key={landlord.id} value={landlord.id}>
              {landlord.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rent-periods-renter">Inquilino</Label>
        <select
          id="rent-periods-renter"
          className={SELECT_CLASS}
          value={value.renter_id ?? ''}
          onChange={(event) => onChange({ renter_id: event.target.value || undefined })}
        >
          <option value="">Todos</option>
          {renters.map((renter) => (
            <option key={renter.id} value={renter.id}>
              {renter.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

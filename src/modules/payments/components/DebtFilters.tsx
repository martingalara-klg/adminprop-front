// src/modules/payments/components/DebtFilters.tsx
//
// RF-06 + CA-04-09: filtros de la vista global de deuda — propietario,
// inquilino, antigüedad (`min_days`).
import type { LandlordSummary, RenterDetail } from '@/api/people.api'
import { Input, Label } from '@/shared/components'
import type { DebtListFilters } from '@/api/payments.api'

type Props = {
  value: DebtListFilters
  landlords: LandlordSummary[]
  renters: RenterDetail[]
  onChange: (patch: Partial<DebtListFilters>) => void
}

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

export function DebtFilters({ value, landlords, renters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="debt-landlord">Propietario</Label>
        <select
          id="debt-landlord"
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
        <Label htmlFor="debt-renter">Inquilino</Label>
        <select
          id="debt-renter"
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="debt-min-days">Antigüedad mínima (días)</Label>
        <Input
          id="debt-min-days"
          value={value.min_days ?? ''}
          onChange={(event) => {
            const parsed = Number(event.target.value)
            onChange({ min_days: event.target.value && !Number.isNaN(parsed) ? parsed : undefined })
          }}
          className="max-w-[160px]"
        />
      </div>
    </div>
  )
}

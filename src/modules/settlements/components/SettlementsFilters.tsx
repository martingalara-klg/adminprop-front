// src/modules/settlements/components/SettlementsFilters.tsx
//
// RF-01: filtros del listado — período, propietario, estado. Mismo
// patrón que payments/components/DebtFilters.tsx. Issue #78: el período
// usa el `PeriodSelector` compartido; como acá el período es un filtro
// OPCIONAL (sin período = todas las liquidaciones), `onClear` agrega el
// botón "Todos" que limpia el filtro (`period: undefined`).
import type { LandlordSummary } from '@/api/people.api'
import type { SettlementListFilters } from '@/api/settlements.api'
import { Label, PeriodSelector } from '@/shared/components'
import { SETTLEMENT_STATUS_OPTIONS, SETTLEMENT_STATUS_LABELS } from '../schemas/settlement.schema'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

type Props = {
  value: SettlementListFilters
  landlords: LandlordSummary[]
  onChange: (patch: Partial<SettlementListFilters>) => void
}

export function SettlementsFilters({ value, landlords, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <PeriodSelector
        id="settlements-period"
        value={value.period ?? ''}
        onChange={(period) => onChange({ period })}
        onClear={() => onChange({ period: undefined })}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settlements-landlord">Propietario</Label>
        <select
          id="settlements-landlord"
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
        <Label htmlFor="settlements-status">Estado</Label>
        <select
          id="settlements-status"
          className={SELECT_CLASS}
          value={value.status ?? ''}
          onChange={(event) =>
            onChange({
              status: (event.target.value || undefined) as SettlementListFilters['status'],
            })
          }
        >
          <option value="">Todos</option>
          {SETTLEMENT_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SETTLEMENT_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

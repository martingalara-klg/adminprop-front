// src/modules/maintenance/components/WorkOrdersFilters.tsx
//
// RF-01: filtro del listado por estado y propiedad — `sdd_03 §12`
// `GET /work-orders?status=&property_id=`.
import { Label } from '@/shared/components'
import type { PropertySummary } from '@/api/properties.api'
import type { WorkOrderListFilters } from '@/api/maintenance.api'
import { WORK_ORDER_STATUS_LABELS } from '../schemas/maintenance.schema'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

type Props = {
  value: WorkOrderListFilters
  properties: PropertySummary[]
  onChange: (patch: Partial<WorkOrderListFilters>) => void
}

export function WorkOrdersFilters({ value, properties, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="work-order-status-filter">Estado</Label>
        <select
          id="work-order-status-filter"
          className={SELECT_CLASS}
          value={value.status ?? ''}
          onChange={(event) =>
            onChange({
              status: (event.target.value || undefined) as WorkOrderListFilters['status'],
            })
          }
        >
          <option value="">Todos</option>
          {Object.entries(WORK_ORDER_STATUS_LABELS).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="work-order-property-filter">Propiedad</Label>
        <select
          id="work-order-property-filter"
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
    </div>
  )
}

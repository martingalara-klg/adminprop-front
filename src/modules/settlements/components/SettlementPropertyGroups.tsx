// src/modules/settlements/components/SettlementPropertyGroups.tsx
//
// RF-04: `scope=per_property` — el detalle y los exports agrupan por
// propiedad, con subtotal; el consolidado del propietario queda arriba
// (SettlementTotals). Sólo se renderiza cuando el toggle está en
// per_property (property_groups viene null/undefined en consolidated).
import { formatMoney } from '@/shared/utils/format'
import type { SettlementPropertyGroup } from '@/api/settlements.api'
import { SettlementLineItemsTable } from './SettlementLineItemsTable'

type Props = { propertyGroups: SettlementPropertyGroup[] }

export function SettlementPropertyGroups({ propertyGroups }: Props) {
  return (
    <div className="flex flex-col gap-6" data-testid="settlement-property-groups">
      {propertyGroups.map((group) => (
        <section key={group.property_id} className="rounded-md border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium">{group.property_label}</h3>
            <span className="text-sm font-semibold">Subtotal: {formatMoney(group.subtotal_ars)}</span>
          </div>
          <SettlementLineItemsTable lineItems={group.line_items} />
        </section>
      ))}
    </div>
  )
}

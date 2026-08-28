// src/modules/properties/components/PropertyRecurringCharges.tsx
//
// RF-03 + CA-01-05: "Conceptos recurrentes activos (rentas, muni) — link
// al Módulo 5". Solo lectura acá — el alta vive en un modal (issue #48,
// ver `RecurringChargeForm` + `PropertyDetailPage`). La carga mensual de
// importes (spec_module_05, liquidaciones UI) es #14 y queda fuera de
// este issue.
import { EmptyState } from '@/shared/components'
import type { RecurringChargeDetail } from '@/api/properties.api'
import { CHARGE_TYPE_LABELS } from '../schemas/property.schema'

type Props = {
  charges: RecurringChargeDetail[]
}

export function PropertyRecurringCharges({ charges }: Props) {
  const activeCharges = charges.filter((charge) => charge.is_active)

  if (activeCharges.length === 0) {
    return (
      <EmptyState
        title="Sin conceptos recurrentes activos"
        description="Los importes mensuales se cargan desde el módulo de liquidaciones."
      />
    )
  }

  return (
    <table className="w-full text-sm" data-testid="property-recurring-charges">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Tipo</th>
          <th className="py-2 font-medium">Etiqueta</th>
        </tr>
      </thead>
      <tbody>
        {activeCharges.map((charge) => (
          <tr key={charge.id} className="border-b last:border-0">
            <td className="py-2 pr-4">
              {CHARGE_TYPE_LABELS[charge.charge_type] ?? charge.charge_type}
            </td>
            <td className="py-2">{charge.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

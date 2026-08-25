// src/modules/payments/components/RentPeriodsTable.tsx
//
// RF-02: panel del mes. `RentPeriodSummary` (sdd_03 §9) sólo trae
// `property_id`/`landlord_id`/`renter_id` (UUIDs) — no denormaliza
// dirección/nombre. Este componente recibe los mapas id→etiqueta ya
// resueltos por la página (a partir de las mismas listas que alimentan
// los filtros) para mostrar "propiedad" e "inquilino" legibles sin
// inventar un endpoint nuevo (decisión documentada en el PR).
import { Link } from 'react-router-dom'
import type { RentPeriodSummary } from '@/api/payments.api'
import { formatMoney } from '@/shared/utils/format'

type Props = {
  rentPeriods: RentPeriodSummary[]
  propertyLabels: Record<string, string>
  renterLabels: Record<string, string>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
}

export function RentPeriodsTable({ rentPeriods, propertyLabels, renterLabels }: Props) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Propiedad</th>
          <th className="py-2 pr-4 font-medium">Inquilino</th>
          <th className="py-2 pr-4 font-medium">Monto</th>
          <th className="py-2 pr-4 font-medium">Saldo</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Días de mora</th>
          <th className="py-2 pr-4 font-medium">Interés sugerido</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {rentPeriods.map((rentPeriod) => (
          <tr key={rentPeriod.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{propertyLabels[rentPeriod.property_id] ?? rentPeriod.property_id}</td>
            <td className="py-2 pr-4">{renterLabels[rentPeriod.renter_id] ?? rentPeriod.renter_id}</td>
            <td className="py-2 pr-4">
              {formatMoney(rentPeriod.amount_due)} {rentPeriod.currency}
            </td>
            <td className="py-2 pr-4">
              {formatMoney(rentPeriod.balance)} {rentPeriod.currency}
            </td>
            <td className="py-2 pr-4">
              {STATUS_LABELS[rentPeriod.status] ?? rentPeriod.status}
              {rentPeriod.in_arrears ? (
                <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                  En mora
                </span>
              ) : null}
            </td>
            <td className="py-2 pr-4">{rentPeriod.days_late}</td>
            <td className="py-2 pr-4">{formatMoney(rentPeriod.suggested_interest)}</td>
            <td className="py-2">
              <Link
                to={`/payments/${rentPeriod.id}`}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Registrar cobro
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

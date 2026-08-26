// src/modules/settlements/components/SettlementsTable.tsx
//
// RF-01: listado de liquidaciones. "requiere regeneración" (CA-05-06)
// visible por fila cuando `needs_regeneration` viene poblado — se anuló
// un cobro incluido en una liquidación ya emitida.
import { Link } from 'react-router-dom'
import type { SettlementSummary } from '@/api/settlements.api'
import { formatMoney, formatDate } from '@/shared/utils/format'
import { SETTLEMENT_STATUS_LABELS } from '../schemas/settlement.schema'

type Props = {
  settlements: SettlementSummary[]
  landlordLabels: Record<string, string>
}

export function SettlementsTable({ settlements, landlordLabels }: Props) {
  return (
    <table className="w-full text-sm" data-testid="settlements-table">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Propietario</th>
          <th className="py-2 pr-4 font-medium">Período</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Neto a rendir</th>
          <th className="py-2 pr-4 font-medium">Generada</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {settlements.map((settlement) => (
          <tr key={settlement.id} className="border-b last:border-0">
            <td className="py-2 pr-4">
              {landlordLabels[settlement.landlord_id] ?? settlement.landlord_id}
            </td>
            <td className="py-2 pr-4">{settlement.period.slice(0, 7)}</td>
            <td className="py-2 pr-4">
              <span className="inline-flex items-center gap-1.5">
                {SETTLEMENT_STATUS_LABELS[settlement.status as 'draft' | 'issued'] ??
                  settlement.status}
                {settlement.needs_regeneration ? (
                  <span
                    className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    data-testid="needs-regeneration-badge"
                  >
                    Requiere regeneración
                  </span>
                ) : null}
              </span>
            </td>
            <td className="py-2 pr-4">{formatMoney(settlement.net_amount)}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {formatDate(settlement.created_at)}
            </td>
            <td className="py-2">
              <Link
                to={`/settlements/${settlement.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver detalle
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

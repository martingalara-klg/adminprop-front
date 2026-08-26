// src/modules/people/components/LandlordSettlementsList.tsx
//
// CA-05-07 (issue #14): historial de liquidaciones desde la ficha del
// propietario. Sólo lectura + link al detalle (`/settlements/:id`,
// módulo settlements) — no duplica acciones de emitir/regenerar acá.
import { Link } from 'react-router-dom'
import { EmptyState } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'
import type { SettlementSummary } from '@/api/settlements.api'

const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', issued: 'Emitida' }

type Props = { settlements: SettlementSummary[] }

export function LandlordSettlementsList({ settlements }: Props) {
  if (settlements.length === 0) {
    return (
      <EmptyState
        title="Sin liquidaciones"
        description="Este propietario todavía no tiene liquidaciones generadas."
      />
    )
  }

  return (
    <table className="w-full text-sm" data-testid="landlord-settlements-list">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Período</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Neto a rendir</th>
          <th className="py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {settlements.map((settlement) => (
          <tr key={settlement.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{settlement.period.slice(0, 7)}</td>
            <td className="py-2 pr-4">
              <span className="inline-flex items-center gap-1.5">
                {STATUS_LABELS[settlement.status] ?? settlement.status}
                {settlement.needs_regeneration ? (
                  <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Requiere regeneración
                  </span>
                ) : null}
              </span>
            </td>
            <td className="py-2 pr-4">{formatMoney(settlement.net_amount)}</td>
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

// src/modules/contracts/components/ContractAdjustmentsHistory.tsx
//
// RF-01 + RF-04 paso 5: historial de ajustes del contrato (pendientes y
// aplicados). Cada ajuste aplicado es inmutable — sólo lectura acá.
import { EmptyState } from '@/shared/components'
import type { AdjustmentSummary } from '@/api/contracts.api'
import { formatDate, formatMoney } from '@/shared/utils/format'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  applied: 'Aplicado',
}

type Props = {
  adjustments: AdjustmentSummary[]
}

export function ContractAdjustmentsHistory({ adjustments }: Props) {
  if (adjustments.length === 0) {
    return (
      <EmptyState
        title="Sin ajustes registrados"
        description="Este contrato todavía no tuvo ajustes por índice."
      />
    )
  }

  return (
    <table className="w-full text-sm" data-testid="contract-adjustments-history">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2">Período</th>
          <th className="py-2">Estado</th>
          <th className="py-2">%</th>
          <th className="py-2">Monto anterior</th>
          <th className="py-2">Monto nuevo</th>
          <th className="py-2">Aplicado por</th>
        </tr>
      </thead>
      <tbody>
        {adjustments.map((adjustment) => (
          <tr key={adjustment.id} className="border-b last:border-0">
            <td className="py-2">{formatDate(adjustment.due_period)}</td>
            <td className="py-2">{STATUS_LABELS[adjustment.status] ?? adjustment.status}</td>
            <td className="py-2">{adjustment.pct_applied ? `${adjustment.pct_applied}%` : '—'}</td>
            <td className="py-2">
              {adjustment.previous_amount ? formatMoney(adjustment.previous_amount) : '—'}
            </td>
            <td className="py-2">
              {adjustment.new_amount ? formatMoney(adjustment.new_amount) : '—'}
            </td>
            <td className="py-2">{adjustment.applied_by ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

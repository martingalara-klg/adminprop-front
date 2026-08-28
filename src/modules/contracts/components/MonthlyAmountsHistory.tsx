// src/modules/contracts/components/MonthlyAmountsHistory.tsx
//
// Issue #56 punto 6 (espejo del back#106, decisión #125): historial de
// valores locativos — tabla mes a mes desde `monthly_amounts[]`
// (`GET /contracts/:id`), calculado enteramente en el backend (el front
// no deriva el monto de cada mes, sólo lo muestra). El backend ya lo
// entrega en orden DESCENDENTE (mes actual primero) — no reordenar acá.
// Convive con `ContractAdjustmentsHistory` (historial de ajustes por
// índice): éste es "cuánto se debía cada mes", aquél es "cuándo/cómo
// cambió el monto vigente".
import { EmptyState } from '@/shared/components'
import type { MonthlyAmount } from '@/api/contracts.api'
import { formatDate, formatMoney } from '@/shared/utils/format'

type Props = {
  monthlyAmounts: MonthlyAmount[]
}

export function MonthlyAmountsHistory({ monthlyAmounts }: Props) {
  if (monthlyAmounts.length === 0) {
    return (
      <EmptyState
        title="Sin historial de valores locativos"
        description="Todavía no hay meses calculados para este contrato."
      />
    )
  }

  return (
    <table className="w-full text-sm" data-testid="monthly-amounts-history">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2">Mes</th>
          <th className="py-2">Monto</th>
        </tr>
      </thead>
      <tbody>
        {monthlyAmounts.map((entry) => (
          <tr key={entry.period} className="border-b last:border-0">
            <td className="py-2">{formatDate(entry.period)}</td>
            <td className="py-2">{formatMoney(entry.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

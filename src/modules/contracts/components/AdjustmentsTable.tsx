// src/modules/contracts/components/AdjustmentsTable.tsx
//
// RF-04 paso 2/3, CA-03-04: bandeja de ajustes pendientes — contrato,
// período que vence, y acceso al flujo de aplicación del %.
import { Link } from 'react-router-dom'
import type { AdjustmentSummary } from '@/api/contracts.api'
import { formatDate } from '@/shared/utils/format'

type Props = {
  adjustments: AdjustmentSummary[]
  selectedAdjustmentId: string | null
  onSelect: (adjustmentId: string) => void
}

export function AdjustmentsTable({ adjustments, selectedAdjustmentId, onSelect }: Props) {
  return (
    <table className="w-full text-sm" data-testid="adjustments-table">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2">Contrato</th>
          <th className="py-2">Período que vence</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {adjustments.map((adjustment) => (
          <tr key={adjustment.id} className="border-b last:border-0">
            <td className="py-2">
              <Link
                to={`/contracts/${adjustment.contract_id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Ver contrato
              </Link>
            </td>
            <td className="py-2">{formatDate(adjustment.due_period)}</td>
            <td className="py-2 text-right">
              <button
                type="button"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                aria-pressed={selectedAdjustmentId === adjustment.id}
                onClick={() => onSelect(adjustment.id)}
              >
                Ingresar % de ajuste
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

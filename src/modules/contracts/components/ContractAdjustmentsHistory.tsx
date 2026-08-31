// src/modules/contracts/components/ContractAdjustmentsHistory.tsx
//
// RF-01 + RF-04 paso 5: historial de ajustes del contrato (pendientes y
// aplicados). Cada ajuste aplicado es inmutable — sólo lectura acá.
//
// Issue #50 (espejo de back#100, RN-08/RN-C06, CA-03-11): el ajuste
// sintético de "carga inicial" (alta de contrato en curso) se distingue
// del resto — `pct_applied` viene `null` y `notes` prefijado
// `"Carga inicial:"`. Se presenta con una etiqueta propia, nunca como un
// "%" vacío/genérico, para no confundirlo con un ajuste manual normal.
//
// Issue #70 (espejo de back#118, decisión #127, feedback #3 del PO):
// - "Aplicado por" muestra `applied_by_name` (full_name resuelto por el
//   backend), nunca el UUID crudo de `applied_by`.
// - La columna % muestra `pct_effective` (recalculado por el backend)
//   para TODAS las filas aplicadas, incluida la de "Carga inicial" — la
//   etiqueta se mantiene como marca de origen, además del %.
import { EmptyState } from '@/shared/components'
import type { AdjustmentSummary } from '@/api/contracts.api'
import { formatDate, formatMoney, formatPercent } from '@/shared/utils/format'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  applied: 'Aplicado',
}

const INITIAL_LOAD_NOTES_PREFIX = 'Carga inicial:'

function isInitialLoadAdjustment(adjustment: AdjustmentSummary): boolean {
  return adjustment.pct_applied === null && !!adjustment.notes?.startsWith(INITIAL_LOAD_NOTES_PREFIX)
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
        {adjustments.map((adjustment) => {
          const isInitialLoad = isInitialLoadAdjustment(adjustment)
          return (
            <tr key={adjustment.id} className="border-b last:border-0">
              <td className="py-2">{formatDate(adjustment.due_period)}</td>
              <td className="py-2">{STATUS_LABELS[adjustment.status] ?? adjustment.status}</td>
              <td className="py-2">
                <span className="inline-flex items-center gap-2">
                  {adjustment.pct_effective !== null
                    ? formatPercent(adjustment.pct_effective)
                    : '—'}
                  {isInitialLoad ? (
                    <span
                      className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      data-testid={`initial-load-badge-${adjustment.id}`}
                    >
                      Carga inicial
                    </span>
                  ) : null}
                </span>
              </td>
              <td className="py-2">
                {adjustment.previous_amount ? formatMoney(adjustment.previous_amount) : '—'}
              </td>
              <td className="py-2">
                {adjustment.new_amount ? formatMoney(adjustment.new_amount) : '—'}
              </td>
              <td className="py-2">{adjustment.applied_by_name ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

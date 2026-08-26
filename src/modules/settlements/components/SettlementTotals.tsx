// src/modules/settlements/components/SettlementTotals.tsx
//
// RF-02: totales de la liquidación (todo en ARS — RN-L01) + estado
// draft/issued + marca "requiere regeneración" (CA-05-06).
import { formatMoney, formatPercent, formatDate } from '@/shared/utils/format'
import type { SettlementDetail } from '@/api/settlements.api'

const STATUS_LABELS: Record<string, string> = { draft: 'Borrador', issued: 'Emitida' }

type Props = { settlement: SettlementDetail }

export function SettlementTotals({ settlement }: Props) {
  return (
    <div className="flex flex-col gap-3" data-testid="settlement-totals">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {STATUS_LABELS[settlement.status] ?? settlement.status}
        </span>
        {settlement.needs_regeneration ? (
          <span
            className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            data-testid="needs-regeneration-badge"
          >
            Requiere regeneración
          </span>
        ) : null}
        {settlement.regenerated_count > 0 ? (
          <span className="text-xs text-muted-foreground">
            Regenerada {settlement.regenerated_count} {settlement.regenerated_count === 1 ? 'vez' : 'veces'}
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Total cobrado</dt>
          <dd>{formatMoney(settlement.total_collected)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Comisión ({formatPercent(settlement.commission_pct_used)})</dt>
          <dd>{formatMoney(settlement.commission_total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cargos</dt>
          <dd>{formatMoney(settlement.charges_total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Reparaciones</dt>
          <dd>{formatMoney(settlement.repairs_total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Ya rendido</dt>
          <dd>{formatMoney(settlement.already_settled_total)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Neto a rendir</dt>
          <dd className="font-semibold">{formatMoney(settlement.net_amount)}</dd>
        </div>
        {settlement.exchange_rate ? (
          <div>
            <dt className="text-muted-foreground">Tipo de cambio</dt>
            <dd>{settlement.exchange_rate}</dd>
          </div>
        ) : null}
        {settlement.issued_at ? (
          <div>
            <dt className="text-muted-foreground">Emitida</dt>
            <dd>{formatDate(settlement.issued_at)}</dd>
          </div>
        ) : null}
      </dl>

      {settlement.job_status === 'with_errors' && settlement.warnings.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium">Advertencias</p>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {settlement.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

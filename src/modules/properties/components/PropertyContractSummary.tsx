// src/modules/properties/components/PropertyContractSummary.tsx
//
// RF-03 + CA-01-05: "Contrato vigente (si hay) con inquilino y monto
// actual — link al Módulo 3". El módulo Contratos (#11) todavía no
// tiene pantallas, así que no hay link al contrato en sí; el inquilino
// sí tiene ficha propia (#9) y se linkea.
import { Link } from 'react-router-dom'
import { EmptyState } from '@/shared/components'
import type { ContractSummary } from '@/api/contracts.api'
import { formatDate, formatMoney } from '@/shared/utils/format'

const CURRENCY_LABELS: Record<string, string> = { ARS: 'ARS', USD: 'USD' }

type Props = {
  contract: ContractSummary | null
  renterName: string | null
}

export function PropertyContractSummary({ contract, renterName }: Props) {
  if (!contract) {
    return (
      <EmptyState
        title="Sin contrato vigente"
        description="Esta propiedad no tiene un contrato activo en este momento."
      />
    )
  }

  return (
    <dl className="grid grid-cols-2 gap-3 text-sm" data-testid="property-active-contract">
      <div>
        <dt className="text-muted-foreground">Inquilino</dt>
        <dd>
          {renterName ? (
            <Link
              to={`/people/renters/${contract.renter_id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {renterName}
            </Link>
          ) : (
            '—'
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Monto actual</dt>
        <dd>
          {formatMoney(contract.current_amount)} {CURRENCY_LABELS[contract.currency] ?? contract.currency}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Vigencia</dt>
        <dd>
          {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">% mora diaria</dt>
        <dd>{contract.daily_late_fee_pct}%</dd>
      </div>
    </dl>
  )
}

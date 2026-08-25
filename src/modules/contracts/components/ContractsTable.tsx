// src/modules/contracts/components/ContractsTable.tsx
//
// RF-01: listado de contratos — estado, propiedad, inquilino, moneda,
// monto vigente, vigencia. Cada fila linkea a la ficha del contrato.
import { Link } from 'react-router-dom'
import type { ContractSummary } from '@/api/contracts.api'
import { formatDate, formatMoney } from '@/shared/utils/format'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  terminated: 'Terminado',
  expired: 'Vencido',
}

type Props = {
  contracts: ContractSummary[]
}

export function ContractsTable({ contracts }: Props) {
  return (
    <table className="w-full text-sm" data-testid="contracts-table">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2">Estado</th>
          <th className="py-2">Moneda</th>
          <th className="py-2">Monto vigente</th>
          <th className="py-2">Vigencia</th>
          <th className="py-2" />
        </tr>
      </thead>
      <tbody>
        {contracts.map((contract) => (
          <tr key={contract.id} className="border-b last:border-0">
            <td className="py-2">{STATUS_LABELS[contract.status] ?? contract.status}</td>
            <td className="py-2">{contract.currency}</td>
            <td className="py-2">{formatMoney(contract.current_amount)}</td>
            <td className="py-2">
              {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
            </td>
            <td className="py-2 text-right">
              <Link
                to={`/contracts/${contract.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Ver contrato
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

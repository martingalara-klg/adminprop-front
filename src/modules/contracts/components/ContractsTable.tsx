// src/modules/contracts/components/ContractsTable.tsx
//
// RF-01: listado de contratos — dirección, inquilino, estado, moneda,
// monto vigente, vigencia. Cada fila linkea a la ficha del contrato.
//
// Issue #85 (feedback #4 del PO, espejo de back#123 — sdd_03 v1.16 §8,
// RN-12): el listado se agrupa por barrio (encabezado por barrio, orden
// alfabético; los contratos sin barrio al final bajo "Sin barrio") y
// cada fila muestra `property_address` y `renter_name` — campos
// denormalizados del `ContractSummary`, sin fetches extra del cliente.
import { Link } from 'react-router-dom'
import type { ContractSummary } from '@/api/contracts.api'
import { formatDate, formatMoney } from '@/shared/utils/format'
import { groupContractsByNeighborhood } from '../utils/groupContractsByNeighborhood'
import { ContractStateBadge } from './ContractStateBadge'

type Props = {
  contracts: ContractSummary[]
}

const COLUMN_COUNT = 7

export function ContractsTable({ contracts }: Props) {
  const groups = groupContractsByNeighborhood(contracts)

  return (
    <table className="w-full text-sm" data-testid="contracts-table">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2">Dirección</th>
          <th className="py-2">Inquilino</th>
          <th className="py-2">Estado</th>
          <th className="py-2">Moneda</th>
          <th className="py-2">Monto vigente</th>
          <th className="py-2">Vigencia</th>
          <th className="py-2" />
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.neighborhood} data-testid="contracts-neighborhood-group">
          <tr className="border-b bg-muted/50">
            <th
              scope="colgroup"
              colSpan={COLUMN_COUNT}
              className="py-2 text-left font-semibold"
              data-testid="contracts-neighborhood-heading"
            >
              {group.neighborhood}
            </th>
          </tr>
          {group.contracts.map((contract) => (
            <tr key={contract.id} className="border-b last:border-0">
              <td className="py-2">{contract.property_address}</td>
              <td className="py-2">{contract.renter_name}</td>
              <td className="py-2">
                <ContractStateBadge status={contract.status} />
              </td>
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
      ))}
    </table>
  )
}

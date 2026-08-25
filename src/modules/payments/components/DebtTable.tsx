// src/modules/payments/components/DebtTable.tsx
//
// RF-06 + CA-04-09: una fila por contrato con deuda. `DebtEntryData`
// (sdd_03 §9) sólo trae IDs — igual criterio de `RentPeriodsTable`: los
// labels de propiedad/propietario/inquilino se resuelven con los mapas
// que arma la página a partir de las listas de opciones.
import { Link } from 'react-router-dom'
import type { DebtEntryData } from '@/api/payments.api'
import { EmptyState } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'

type Props = {
  entries: DebtEntryData[]
  propertyLabels: Record<string, string>
  landlordLabels: Record<string, string>
  renterLabels: Record<string, string>
}

export function DebtTable({ entries, propertyLabels, landlordLabels, renterLabels }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Sin deuda"
        description="No hay contratos con períodos adeudados para los filtros aplicados."
      />
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Propiedad</th>
          <th className="py-2 pr-4 font-medium">Propietario</th>
          <th className="py-2 pr-4 font-medium">Inquilino</th>
          <th className="py-2 pr-4 font-medium">Períodos adeudados</th>
          <th className="py-2 pr-4 font-medium">Saldo</th>
          <th className="py-2 pr-4 font-medium">Días de mora</th>
          <th className="py-2 font-medium">Interés sugerido</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.contract_id} className="border-b last:border-0">
            <td className="py-2 pr-4">{propertyLabels[entry.property_id] ?? entry.property_id}</td>
            <td className="py-2 pr-4">{landlordLabels[entry.landlord_id] ?? entry.landlord_id}</td>
            <td className="py-2 pr-4">
              <Link
                to={`/people/renters/${entry.renter_id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {renterLabels[entry.renter_id] ?? entry.renter_id}
              </Link>
            </td>
            <td className="py-2 pr-4">{entry.periods_overdue}</td>
            <td className="py-2 pr-4">{formatMoney(entry.balance)}</td>
            <td className="py-2 pr-4">{entry.days_late}</td>
            <td className="py-2">{formatMoney(entry.suggested_interest)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

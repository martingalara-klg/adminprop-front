// src/modules/people/components/RenterDebtPanel.tsx
//
// CA-02-05: "la ficha del inquilino muestra sus contratos y su estado de
// deuda con: períodos adeudados, saldo, días de mora e interés sugerido
// acumulado". `DebtEntryData` es por contrato (`periods_overdue`,
// `balance`, `days_late`, `suggested_interest`) — sdd_03 §6 +
// generated/types.ts. Estado `empty`: sin entradas -> "sin deuda".
import type { DebtEntryData } from '@/api/people.api'
import { EmptyState } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'

type Props = { entries: DebtEntryData[] }

export function RenterDebtPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Sin deuda"
        description="Este inquilino no tiene períodos adeudados a la fecha."
      />
    )
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Períodos adeudados</th>
          <th className="py-2 pr-4 font-medium">Saldo</th>
          <th className="py-2 pr-4 font-medium">Días de mora</th>
          <th className="py-2 font-medium">Interés sugerido</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.contract_id} className="border-b last:border-0">
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

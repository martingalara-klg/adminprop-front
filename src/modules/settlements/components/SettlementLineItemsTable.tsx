// src/modules/settlements/components/SettlementLineItemsTable.tsx
//
// RF-02: detalle línea por línea (consolidated). RF-04 agrega
// property_groups aparte (ver SettlementPropertyGroups).
import { formatMoney } from '@/shared/utils/format'
import type { SettlementLineItemDetail } from '@/api/settlements.api'

const LINE_TYPE_LABELS: Record<string, string> = {
  rent_collected: 'Cobro',
  commission: 'Comisión',
  tax_charge: 'Cargo',
  repair: 'Reparación',
  already_settled: 'Ya rendido',
}

type Props = { lineItems: SettlementLineItemDetail[] }

export function SettlementLineItemsTable({ lineItems }: Props) {
  return (
    <table className="w-full text-sm" data-testid="settlement-line-items">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Tipo</th>
          <th className="py-2 pr-4 font-medium">Descripción</th>
          <th className="py-2 pr-4 font-medium">Importe original</th>
          <th className="py-2 font-medium">Importe ARS</th>
        </tr>
      </thead>
      <tbody>
        {lineItems.map((item) => (
          <tr key={item.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{LINE_TYPE_LABELS[item.line_type] ?? item.line_type}</td>
            <td className="py-2 pr-4">{item.description || '—'}</td>
            <td className="py-2 pr-4">
              {formatMoney(item.original_amount)} {item.original_currency}
            </td>
            <td className="py-2">{formatMoney(item.amount_ars)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

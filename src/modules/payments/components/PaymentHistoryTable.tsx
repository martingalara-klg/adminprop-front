// src/modules/payments/components/PaymentHistoryTable.tsx
//
// RF-02/RF-05/RF-07 — CA-04-XX (issue #33): historial de cobros del
// período, ordenado tal como lo devuelve el backend (`payment_date`
// ascendente, sdd_03 §9 v1.7). Incluye anulados (RN-D04). Empty state
// cuando el período todavía no tiene cobros registrados.
import { EmptyState } from '@/shared/components'
import type { PaymentDetail } from '@/api/payments.api'
import { PaymentHistoryRow } from './PaymentHistoryRow'

type Props = {
  payments: PaymentDetail[]
  canVoidPayment: boolean
}

export function PaymentHistoryTable({ payments, canVoidPayment }: Props) {
  if (payments.length === 0) {
    return (
      <EmptyState
        title="Sin cobros registrados"
        description="Todavía no se registró ningún cobro para este período."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid="payment-history-table">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Fecha</th>
            <th className="py-2 pr-4 font-medium">Medio</th>
            <th className="py-2 pr-4 font-medium">Moneda</th>
            <th className="py-2 pr-4 font-medium">Importe</th>
            <th className="py-2 pr-4 font-medium">TC</th>
            <th className="py-2 pr-4 font-medium">Destino</th>
            <th className="py-2 pr-4 font-medium">Interés sugerido</th>
            <th className="py-2 pr-4 font-medium">Interés cobrado</th>
            <th className="py-2 pr-4 font-medium">Interés perdonado</th>
            <th className="py-2 pr-4 font-medium">Notas</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <PaymentHistoryRow key={payment.id} payment={payment} canVoidPayment={canVoidPayment} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

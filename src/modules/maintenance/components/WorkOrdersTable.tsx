// src/modules/maintenance/components/WorkOrdersTable.tsx
//
// CA-06-01: "lo ve en su listado con la dirección de la propiedad" —
// primera pantalla que el encargado usa; dirección visible primero,
// sin datos de contrato/inquilino/cobros (RN-03, el propio
// WorkOrderSummary del backend nunca los tuvo).
import { Link } from 'react-router-dom'
import { WorkOrderStatusBadge } from './WorkOrderStatusBadge'
import { PayerBadge } from './PayerBadge'
import { formatDate, formatMoney } from '@/shared/utils/format'
import type { WorkOrderSummary } from '@/api/maintenance.api'

type Props = { workOrders: WorkOrderSummary[] }

export function WorkOrdersTable({ workOrders }: Props) {
  return (
    <table className="w-full text-sm" data-testid="work-orders-table">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Propiedad</th>
          <th className="py-2 pr-4 font-medium">Título</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Pagador</th>
          <th className="py-2 pr-4 font-medium">Costo final</th>
          <th className="py-2 font-medium">Creado</th>
        </tr>
      </thead>
      <tbody>
        {workOrders.map((workOrder) => (
          <tr key={workOrder.id} className="border-b last:border-0">
            <td className="py-2 pr-4">
              <Link
                to={`/maintenance/${workOrder.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {workOrder.property_address}
              </Link>
            </td>
            <td className="py-2 pr-4">{workOrder.title}</td>
            <td className="py-2 pr-4">
              <WorkOrderStatusBadge status={workOrder.status} />
            </td>
            <td className="py-2 pr-4">
              <PayerBadge payer={workOrder.payer} />
            </td>
            <td className="py-2 pr-4">
              {workOrder.final_cost ? formatMoney(workOrder.final_cost) : '—'}
            </td>
            <td className="py-2 text-muted-foreground">{formatDate(workOrder.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

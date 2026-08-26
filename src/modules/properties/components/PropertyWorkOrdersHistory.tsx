// src/modules/properties/components/PropertyWorkOrdersHistory.tsx
//
// RF-03 + CA-01-05 (UC-16): "Historial de reparaciones con pagador y
// costos — link al Módulo 6". El módulo Mantenimiento (#13) ya tiene
// ficha de detalle por pedido (`/maintenance/:workOrderId`) — el título
// linkea ahí. Sólo owner/admin llegan a esta ficha (gate por
// `property:read`, que `maintenance` no tiene — RN-03), y ambos también
// tienen `work-order:read`, así que el link nunca lleva a un
// ForbiddenState.
//
// Issue #14 (RN-L04): `settled_in_settlement_id` (poblado sólo en
// reparaciones `payer=agency` ya descontadas) reemplaza acá el texto
// estático "pendiente de liquidar" que #13 dejó en
// WorkOrderDetailPage — este historial es el único punto de la UI que
// recibe el campo (`PropertyWorkOrderHistoryEntry`, no `WorkOrderDetail`),
// así que es donde puede mostrarse el vínculo real a la liquidación en
// vez de sólo la advertencia genérica.
import { Link } from 'react-router-dom'
import { EmptyState } from '@/shared/components'
import type { PropertyWorkOrderHistoryEntry } from '@/api/properties.api'
import { formatDate, formatMoney } from '@/shared/utils/format'

function SettlementStatus({ workOrder }: { workOrder: PropertyWorkOrderHistoryEntry }) {
  if (workOrder.payer !== 'agency' || workOrder.status !== 'closed') return <>—</>

  if (workOrder.settled_in_settlement_id) {
    return (
      <Link
        to={`/settlements/${workOrder.settled_in_settlement_id}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Liquidado
      </Link>
    )
  }

  return <span className="text-amber-700">Pendiente de liquidar</span>
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierta',
  in_progress: 'En curso',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
}

const PAYER_LABELS: Record<string, string> = {
  landlord: 'Dueño',
  agency: 'Administración',
}

type Props = { workOrders: PropertyWorkOrderHistoryEntry[] }

export function PropertyWorkOrdersHistory({ workOrders }: Props) {
  if (workOrders.length === 0) {
    return (
      <EmptyState
        title="Sin reparaciones registradas"
        description="Esta propiedad no tiene pedidos de reparación en su historial."
      />
    )
  }

  return (
    <table className="w-full text-sm" data-testid="property-work-orders-history">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 pr-4 font-medium">Título</th>
          <th className="py-2 pr-4 font-medium">Estado</th>
          <th className="py-2 pr-4 font-medium">Pagador</th>
          <th className="py-2 pr-4 font-medium">Costo final</th>
          <th className="py-2 pr-4 font-medium">Liquidación</th>
          <th className="py-2 font-medium">Cerrada</th>
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
                {workOrder.title}
              </Link>
            </td>
            <td className="py-2 pr-4">{STATUS_LABELS[workOrder.status] ?? workOrder.status}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {PAYER_LABELS[workOrder.payer] ?? workOrder.payer}
            </td>
            <td className="py-2 pr-4">
              {workOrder.final_cost ? formatMoney(workOrder.final_cost) : '—'}
            </td>
            <td className="py-2 pr-4 text-sm">
              <SettlementStatus workOrder={workOrder} />
            </td>
            <td className="py-2 text-muted-foreground">{formatDate(workOrder.closed_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

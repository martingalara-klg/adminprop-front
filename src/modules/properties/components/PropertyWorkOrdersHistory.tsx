// src/modules/properties/components/PropertyWorkOrdersHistory.tsx
//
// RF-03 + CA-01-05 (UC-16): "Historial de reparaciones con pagador y
// costos — link al Módulo 6". El módulo Mantenimiento (#13) todavía no
// tiene ficha de detalle por pedido, así que se muestra la tabla de
// datos sin links a pantallas inexistentes.
import { EmptyState } from '@/shared/components'
import type { PropertyWorkOrderHistoryEntry } from '@/api/properties.api'
import { formatDate, formatMoney } from '@/shared/utils/format'

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
          <th className="py-2 font-medium">Cerrada</th>
        </tr>
      </thead>
      <tbody>
        {workOrders.map((workOrder) => (
          <tr key={workOrder.id} className="border-b last:border-0">
            <td className="py-2 pr-4">{workOrder.title}</td>
            <td className="py-2 pr-4">{STATUS_LABELS[workOrder.status] ?? workOrder.status}</td>
            <td className="py-2 pr-4 text-muted-foreground">
              {PAYER_LABELS[workOrder.payer] ?? workOrder.payer}
            </td>
            <td className="py-2 pr-4">
              {workOrder.final_cost ? formatMoney(workOrder.final_cost) : '—'}
            </td>
            <td className="py-2 text-muted-foreground">{formatDate(workOrder.closed_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

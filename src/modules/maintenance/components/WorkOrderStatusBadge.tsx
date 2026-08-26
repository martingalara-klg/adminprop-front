// src/modules/maintenance/components/WorkOrderStatusBadge.tsx
//
// RF-01..RF-05: badge visual del estado del pedido (open/in_progress/
// closed/cancelled) — mismo criterio que ContractStatusBadge/
// PaymentStatusBadge de otros módulos (presentacional puro).
import { WORK_ORDER_STATUS_LABELS } from '../schemas/maintenance.schema'

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  closed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-200 text-gray-700',
}

type Props = { status: string }

export function WorkOrderStatusBadge({ status }: Props) {
  const className = STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {WORK_ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// src/modules/notifications/utils/notificationMessages.ts
//
// RF-02: "cada aviso lleva el payload suficiente para navegar al recurso
// ... sin queries extra". Mapea `event_type` + `payload` (shapes reales
// emitidos por adminprop-back — adjustment_service.py, contracts/service.py,
// maintenance/service.py, ver comentarios por evento) a un título es-AR y
// la ruta del front a la que navega el click (issue #15 — CA-NT-04 lado
// UI: "Click en una notificación navega al recurso según su
// event_type/payload").
import type { Notification } from '@/api/notifications.api'

const EVENT_TITLES: Record<Notification['event_type'], string> = {
  adjustment_pending: 'Ajuste de alquiler pendiente',
  contract_expiring: 'Un contrato está por vencer',
  work_order_created: 'Nuevo pedido de reparación',
  quote_submitted: 'Nueva cotización recibida',
  quote_approved: 'Tu cotización fue aprobada',
  work_order_closed: 'Se cerró un trabajo de mantenimiento',
}

function getPayloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' ? value : undefined
}

export type NotificationDescriptor = {
  title: string
  /** `null` cuando el payload no trae el id esperado (defensive — no debería pasar con el contrato actual). */
  href: string | null
}

/**
 * Resuelve título + ruta de destino para una notificación.
 *
 * - `adjustment_pending` → bandeja de ajustes (`payload.contract_id` no
 *   tiene ficha propia de ajuste; la bandeja es el recurso — RF-04).
 * - `contract_expiring` → ficha del contrato (`payload.contract_id`).
 * - `work_order_created` / `quote_submitted` / `quote_approved` /
 *   `work_order_closed` → ficha del pedido (`payload.work_order_id`).
 */
export function describeNotification(notification: Notification): NotificationDescriptor {
  const { event_type: eventType, payload } = notification
  const title = EVENT_TITLES[eventType]

  switch (eventType) {
    case 'adjustment_pending':
      return { title, href: '/contracts/adjustments' }

    case 'contract_expiring': {
      const contractId = getPayloadString(payload, 'contract_id')
      return { title, href: contractId ? `/contracts/${contractId}` : null }
    }

    case 'work_order_created':
    case 'quote_submitted':
    case 'quote_approved':
    case 'work_order_closed': {
      const workOrderId = getPayloadString(payload, 'work_order_id')
      return { title, href: workOrderId ? `/maintenance/${workOrderId}` : null }
    }

    default:
      return { title, href: null }
  }
}

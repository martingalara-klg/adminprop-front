// src/modules/notifications/components/NotificationList.tsx
//
// Presentacional puro — lista de notificaciones compartida entre el
// dropdown del header (NotificationBell) y la página completa
// (NotificationsListPage). Los estados loading/error/empty los maneja
// el contenedor (flow-implementation.md); este componente sólo el
// `success` con datos.
import type { Notification } from '@/api/notifications.api'
import { NotificationItem } from './NotificationItem'

type Props = {
  notifications: Notification[]
  onItemClick: (notification: Notification) => void
}

export function NotificationList({ notifications, onItemClick }: Props) {
  return (
    <ul className="flex flex-col gap-1">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onClick={onItemClick} />
      ))}
    </ul>
  )
}

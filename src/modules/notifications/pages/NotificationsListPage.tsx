// src/modules/notifications/pages/NotificationsListPage.tsx
//
// Issue #15 — página completa del panel de notificaciones
// (`/notifications`, ya en la navegación desde el issue #6). Mismo
// hook/datos que NotificationBell (una sola query, ver
// useNotificationsList) — acá se muestran TODAS, no solo el preview del
// dropdown. CA-NT-04 lado UI: "abrir el panel lista las notificaciones
// (no leídas destacadas); marcar una como leída actualiza el badge;
// read-all deja el badge en cero".
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, EmptyState, ForbiddenState } from '@/shared/components'
import type { Notification } from '@/api/notifications.api'
import { useNotificationsList, getUnreadCount } from '../hooks/useNotificationsList'
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead'
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead'
import { describeNotification } from '../utils/notificationMessages'
import { NotificationList } from '../components/NotificationList'

export function NotificationsListPage() {
  const canReadNotifications = usePermission('notification:read')
  const navigate = useNavigate()

  const query = useNotificationsList({ enabled: canReadNotifications })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  if (!canReadNotifications) {
    return (
      <ForbiddenState message="No tenés permiso para ver las notificaciones. Consultá con el owner de la organización." />
    )
  }

  const notifications = query.data?.data ?? []
  const unreadCount = getUnreadCount(query.data?.meta)

  function handleItemClick(notification: Notification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }
    const { href } = describeNotification(notification)
    if (href) navigate(href)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Avisos de ajustes pendientes, contratos por vencer y mantenimiento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={unreadCount === 0 || markAllRead.isPending}
          className="text-sm text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Marcar todas como leídas
        </button>
      </header>

      <section>
        {query.isLoading ? <Spinner label="Cargando notificaciones..." /> : null}
        {query.isError ? <ErrorState error={query.error} /> : null}
        {query.data && notifications.length === 0 ? (
          <EmptyState
            title="No tenés notificaciones"
            description="Te avisaremos acá cuando haya novedades."
          />
        ) : null}
        {notifications.length > 0 ? (
          <NotificationList notifications={notifications} onItemClick={handleItemClick} />
        ) : null}
      </section>
    </div>
  )
}

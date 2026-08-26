// src/modules/notifications/components/NotificationBell.tsx
//
// Issue #15 — campanita + badge del header (CA-NT-04 lado UI): "el badge
// muestra las no leídas ... abrir el panel lista las notificaciones (no
// leídas destacadas); marcar una como leída actualiza el badge;
// `read-all` deja el badge en cero". Gate por `notification:read` — los
// 3 roles (owner/admin/maintenance) lo tienen (sdd_03 §"Resumen de
// Autorización" fila "Notificaciones propias"), incluido maintenance
// (recibe `work_order_created` y `quote_approved`).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, EmptyState } from '@/shared/components'
import { cn } from '@/shared/utils/cn'
import type { Notification } from '@/api/notifications.api'
import { useNotificationsList, getUnreadCount } from '../hooks/useNotificationsList'
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead'
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead'
import { describeNotification } from '../utils/notificationMessages'
import { NotificationList } from './NotificationList'

const MAX_ITEMS_IN_DROPDOWN = 10

export function NotificationBell() {
  const canReadNotifications = usePermission('notification:read')
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const query = useNotificationsList({ enabled: canReadNotifications })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  if (!canReadNotifications) return null

  const notifications = query.data?.data ?? []
  const unreadCount = getUnreadCount(query.data?.meta)
  const preview = notifications.slice(0, MAX_ITEMS_IN_DROPDOWN)

  function handleItemClick(notification: Notification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }
    setIsOpen(false)
    const { href } = describeNotification(notification)
    if (href) navigate(href)
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-full p-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            data-testid="notification-badge"
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full',
              'bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground',
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-background p-2 shadow-lg"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-semibold">Notificaciones</span>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
              className="text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Marcar todas como leídas
            </button>
          </div>

          {query.isLoading ? <Spinner label="Cargando notificaciones..." /> : null}
          {query.isError ? <ErrorState error={query.error} /> : null}
          {query.data && preview.length === 0 ? (
            <EmptyState
              title="No tenés notificaciones"
              description="Te avisaremos acá cuando haya novedades."
            />
          ) : null}
          {preview.length > 0 ? (
            <NotificationList notifications={preview} onItemClick={handleItemClick} />
          ) : null}

          <div className="mt-2 border-t pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                navigate('/notifications')
              }}
              className="text-xs text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

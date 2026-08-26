// src/modules/notifications/components/NotificationItem.tsx
//
// Presentacional puro (module-structure.md §"Responsabilidades por
// capa") — una fila del panel/página. No leídas destacadas
// (CA-NT-04 lado UI: "no leídas destacadas") con un punto + fondo sutil.
import { cn } from '@/shared/utils/cn'
import { formatDate } from '@/shared/utils/format'
import type { Notification } from '@/api/notifications.api'
import { describeNotification } from '../utils/notificationMessages'

type Props = {
  notification: Notification
  onClick: (notification: Notification) => void
}

export function NotificationItem({ notification, onClick }: Props) {
  const { title } = describeNotification(notification)
  const isUnread = !notification.read_at

  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(notification)}
        aria-current={isUnread ? undefined : 'false'}
        data-unread={isUnread}
        className={cn(
          'flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/70',
          isUnread ? 'bg-muted/50 font-medium' : 'text-muted-foreground',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
            isUnread ? 'bg-primary' : 'bg-transparent',
          )}
        />
        <span className="flex flex-col gap-0.5">
          <span>{title}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(notification.created_at)}
          </span>
        </span>
        {isUnread ? <span className="sr-only"> (no leída)</span> : null}
      </button>
    </li>
  )
}

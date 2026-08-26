// src/modules/notifications/hooks/useMarkNotificationRead.ts
//
// RF-02/CA-NT-04: "marcar una como leída actualiza el badge". Optimistic
// update — `notifications/:id/read` es idempotente y reversible
// (docs/skills/api-client.md §"Optimistic updates"), a diferencia de las
// mutaciones financieras que nunca lo usan. Snapshot + rollback en
// `onError` por si el 404 de RN-D01 (de otro usuario/organización) llega
// a filtrarse a la UI.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type NotificationListResponse } from '@/api/notifications.api'
import { notificationsListQueryKey } from './useNotificationsList'

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markRead(notificationId),
    retry: 0,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationsListQueryKey })
      const previous = queryClient.getQueryData<NotificationListResponse>(notificationsListQueryKey)

      if (previous) {
        const target = previous.data.find((n) => n.id === notificationId)
        if (target && !target.read_at) {
          const nowIso = new Date().toISOString()
          const currentUnread =
            (previous.meta as { unread_count?: number } | undefined)?.unread_count ?? 0
          queryClient.setQueryData<NotificationListResponse>(notificationsListQueryKey, {
            ...previous,
            data: previous.data.map((n) =>
              n.id === notificationId ? { ...n, read_at: nowIso } : n,
            ),
            meta: { ...previous.meta, unread_count: Math.max(0, currentUnread - 1) },
          })
        }
      }

      return { previous }
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsListQueryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsListQueryKey })
    },
  })
}

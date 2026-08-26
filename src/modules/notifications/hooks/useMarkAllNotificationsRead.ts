// src/modules/notifications/hooks/useMarkAllNotificationsRead.ts
//
// CA-NT-04: "`read-all` las marca todas y el badge queda en cero".
// Optimistic update (misma justificación que useMarkNotificationRead —
// operación idempotente y reversible).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi, type NotificationListResponse } from '@/api/notifications.api'
import { notificationsListQueryKey } from './useNotificationsList'

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    retry: 0,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsListQueryKey })
      const previous = queryClient.getQueryData<NotificationListResponse>(notificationsListQueryKey)

      if (previous) {
        const nowIso = new Date().toISOString()
        queryClient.setQueryData<NotificationListResponse>(notificationsListQueryKey, {
          ...previous,
          data: previous.data.map((n) => (n.read_at ? n : { ...n, read_at: nowIso })),
          meta: { ...previous.meta, unread_count: 0 },
        })
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsListQueryKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsListQueryKey })
    },
  })
}

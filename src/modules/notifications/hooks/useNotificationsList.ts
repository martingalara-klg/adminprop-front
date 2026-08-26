// src/modules/notifications/hooks/useNotificationsList.ts
//
// RF-02 (spec_notificaciones.md) — un único query sirve tanto el panel
// (lista completa, no leídas destacadas) como el badge del header
// (`meta.unread_count`, CA-NT-04): evita un segundo request solo para
// el contador. `staleTime` alineado al TTL del backend (sdd_04 §1.4:
// "Badge de notificaciones no leídas — 5 min").
import { useQuery } from '@tanstack/react-query'
import { notificationsApi, type NotificationsMeta } from '@/api/notifications.api'

const STALE_TIME_MS = 5 * 60_000 // sdd_04 §1.4

export const notificationsListQueryKey = ['notifications', 'list'] as const

export function useNotificationsList(opts: { enabled?: boolean } = {}) {
  const { enabled = true } = opts

  return useQuery({
    queryKey: notificationsListQueryKey,
    queryFn: ({ signal }) => notificationsApi.list({}, { signal }),
    enabled,
    staleTime: STALE_TIME_MS,
  })
}

/** Extrae `unread_count` del `meta` (tipado real de sdd_03 §13, ver notifications.api.ts). */
export function getUnreadCount(meta: unknown): number {
  const typedMeta = meta as Partial<NotificationsMeta> | undefined
  return typedMeta?.unread_count ?? 0
}

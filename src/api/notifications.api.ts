// src/api/notifications.api.ts
//
// Cliente del módulo Notificaciones — sdd_03 §13 "Notificaciones" +
// infrastructure/spec_notificaciones.md RF-02 (issue #15):
//   GET    /notifications                    (?unread=true — propias del usuario)
//   POST   /notifications/:id/read
//   POST   /notifications/read-all
//
// `meta.unread_count` es el badge (CA-NT-04), cacheado 5 min en el
// backend (sdd_04 §1.4) — el mismo GET sirve tanto el panel como el
// contador, sin request extra (ver useNotificationsList).
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type Notification = components['schemas']['Notification']
export type NotificationListResponse = components['schemas']['NotificationListResponse']
export type NotificationReadResponse = components['schemas']['NotificationReadResponse']
export type NotificationReadAllResponse = components['schemas']['NotificationReadAllResponse']

/** `meta` del OpenAPI es `{[key: string]: unknown}` — tipado real según el router (sdd_03 §13). */
export type NotificationsMeta = { unread_count: number }

export type NotificationListFilters = {
  unread?: boolean
}

export const notificationsApi = {
  /** RF-02: solo las propias del usuario autenticado (permiso `notification:read`, los 3 roles lo tienen). */
  async list(
    filters: NotificationListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<NotificationListResponse> {
    const response = await httpClient.get<NotificationListResponse>('/notifications', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-02: RN-D01 — de otro usuario/organización → 404 (no revela existencia). */
  async markRead(notificationId: string): Promise<NotificationReadResponse> {
    const response = await httpClient.post<NotificationReadResponse>(
      `/notifications/${notificationId}/read`,
    )
    return response.data
  },

  /** CA-NT-04: "read-all las marca todas y el badge queda en cero". */
  async markAllRead(): Promise<NotificationReadAllResponse> {
    const response = await httpClient.post<NotificationReadAllResponse>('/notifications/read-all')
    return response.data
  },
}

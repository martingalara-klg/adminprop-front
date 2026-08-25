// src/api/admin.api.ts
//
// Cliente del módulo Administración — sdd_03 §3 "Usuarios y Roles" +
// §4 "Configuración de la Organización" (v1.6):
//   GET    /users                            (user:manage)
//   POST   /users/invite                     (user:manage) — RF-01
//   GET    /users/invitations                (user:manage) — RF-01
//   POST   /users/invitations/:id/resend     (user:manage) — RF-01
//   DELETE /users/invitations/:id            (user:manage) — RF-01
//   PATCH  /users/:id                        (user:manage) — RF-02, LAST_OWNER_REQUIRED
//   DELETE /users/:id                        (user:manage) — RF-02, LAST_OWNER_REQUIRED
//   GET    /roles                            (role:read) — RF-03, solo lectura en MVP
//   GET    /organization/settings            (organization:configure) — RF-04
//   PUT    /organization/settings            (organization:configure) — RF-04
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type UserSummary =
  components['schemas']['adminprop__modules__administracion__schemas__UserSummary']
export type UserListResponse = components['schemas']['UserListResponse']
export type UserResponse = components['schemas']['UserResponse']
export type InviteUserRequest = components['schemas']['InviteUserRequest']
export type ChangeUserRoleRequest = components['schemas']['ChangeUserRoleRequest']
export type InvitationSummary =
  components['schemas']['adminprop__modules__administracion__schemas__InvitationSummary']
export type InvitationListResponse = components['schemas']['InvitationListResponse']
export type InvitationResponse =
  components['schemas']['adminprop__modules__administracion__schemas__InvitationResponse']
export type RoleSummary = components['schemas']['RoleSummary']
export type RoleListResponse = components['schemas']['RoleListResponse']
export type OrganizationSettingsData = components['schemas']['OrganizationSettingsData']
export type OrganizationSettingsResponse = components['schemas']['OrganizationSettingsResponse']
export type OrganizationSettingsUpdate = components['schemas']['OrganizationSettingsUpdate']

export type ListPageFilters = { cursor?: string; limit?: number }

export const adminApi = {
  /** RF-02: miembros de la organización, paginado cursor-based. */
  async listUsers(
    filters: ListPageFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<UserListResponse> {
    const response = await httpClient.get<UserListResponse>('/users', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-02 + CA-07-02: `422 LAST_OWNER_REQUIRED` si es el único owner activo. */
  async changeUserRole(userId: string, payload: ChangeUserRoleRequest): Promise<UserResponse> {
    const response = await httpClient.patch<UserResponse>(`/users/${userId}`, payload)
    return response.data
  },

  /** RF-02 + CA-07-02: desactiva (soft) un miembro. `422 LAST_OWNER_REQUIRED`. */
  async deactivateUser(userId: string): Promise<void> {
    await httpClient.delete(`/users/${userId}`)
  },

  /** RF-01 + CA-07-01: invita con rol `admin` o `maintenance` únicamente. */
  async inviteUser(payload: InviteUserRequest): Promise<InvitationResponse> {
    const response = await httpClient.post<InvitationResponse>('/users/invite', payload)
    return response.data
  },

  /** RF-01: invitaciones `pending`, paginado cursor-based. */
  async listInvitations(
    filters: ListPageFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<InvitationListResponse> {
    const response = await httpClient.get<InvitationListResponse>('/users/invitations', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-01: revoca la invitación anterior y emite una nueva (72h). */
  async resendInvitation(invitationId: string): Promise<InvitationResponse> {
    const response = await httpClient.post<InvitationResponse>(
      `/users/invitations/${invitationId}/resend`,
    )
    return response.data
  },

  /** RF-01: revoca una invitación pendiente. */
  async revokeInvitation(invitationId: string): Promise<void> {
    await httpClient.delete(`/users/invitations/${invitationId}`)
  },

  /** RF-03: los 3 roles de sistema con `permissions[]`. Solo lectura en MVP. */
  async listRoles(opts?: { signal?: AbortSignal }): Promise<RoleListResponse> {
    const response = await httpClient.get<RoleListResponse>('/roles', { signal: opts?.signal })
    return response.data
  },

  /** RF-04: `grace_day`, `contract_expiry_notice_days` y encabezado de liquidaciones. */
  async getSettings(opts?: { signal?: AbortSignal }): Promise<OrganizationSettingsResponse> {
    const response = await httpClient.get<OrganizationSettingsResponse>('/organization/settings', {
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-04 + CA-07-05: `grace_day` rige desde el momento del cambio (RN-05). */
  async updateSettings(
    payload: OrganizationSettingsUpdate,
  ): Promise<OrganizationSettingsResponse> {
    const response = await httpClient.put<OrganizationSettingsResponse>(
      '/organization/settings',
      payload,
    )
    return response.data
  },
}

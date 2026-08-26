// src/api/organizations.api.ts
//
// Cliente de superadmin/organizations — sdd_03 §2 "Super Admin
// (/superadmin/*)" (v1.6, leído directo de adminprop-back porque el sync
// del front está en v1.5 — ver docs/prompts/session-start.md):
//   GET    /superadmin/organizations                       (RF-01 dashboard)
//   POST   /superadmin/organizations                        (RF-02 alta)
//   GET    /superadmin/organizations/:id                    (RF-01 detalle)
//   PATCH  /superadmin/organizations/:id                     (name?/timezone?)
//   POST   /superadmin/organizations/:id/invite-owner        (RF-03)
//   POST   /superadmin/organizations/:id/resend-invitation   (RF-04)
//   POST   /superadmin/organizations/:id/disable             (RF-05)
//   POST   /superadmin/organizations/:id/enable              (RF-05)
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type OrganizationSummary =
  components['schemas']['adminprop__modules__superadmin__schemas__OrganizationSummary']
export type OrganizationDetail = components['schemas']['OrganizationDetail']
export type OrganizationCreate = components['schemas']['OrganizationCreate']
export type OrganizationUpdate = components['schemas']['OrganizationUpdate']
export type OrganizationListResponse = components['schemas']['OrganizationListResponse']
export type OrganizationResponse = components['schemas']['OrganizationResponse']
export type InviteOwnerRequest = components['schemas']['InviteOwnerRequest']
export type InvitationSummary =
  components['schemas']['adminprop__modules__superadmin__schemas__InvitationSummary']
export type InvitationResponse =
  components['schemas']['adminprop__modules__superadmin__schemas__InvitationResponse']
export type OrganizationStatusChangeRequest =
  components['schemas']['OrganizationStatusChangeRequest']

export type ListOrganizationsFilters = {
  status?: string
  search?: string
  cursor?: string
  limit?: number
}

export const organizationsApi = {
  /** RF-01: dashboard — filtros por status y búsqueda por nombre/slug. */
  async list(
    filters: ListOrganizationsFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<OrganizationListResponse> {
    const response = await httpClient.get<OrganizationListResponse>('/superadmin/organizations', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-01 detalle. CA-00-06: solo metadata — nunca datos operativos de la org. */
  async get(
    organizationId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<OrganizationResponse> {
    const response = await httpClient.get<OrganizationResponse>(
      `/superadmin/organizations/${organizationId}`,
      { signal: opts?.signal },
    )
    return response.data
  },

  /** RF-02 + CA-00-01: crea la org en pending_owner, slug autogenerado único. */
  async create(payload: OrganizationCreate): Promise<OrganizationResponse> {
    const response = await httpClient.post<OrganizationResponse>(
      '/superadmin/organizations',
      payload,
    )
    return response.data
  },

  /**
   * sdd_03 §2 (issue #44): PATCH name?/timezone? — al menos uno presente.
   * `slug`/`status` nunca viajan acá (400 VALIDATION_ERROR si se incluyen).
   */
  async update(organizationId: string, payload: OrganizationUpdate): Promise<OrganizationResponse> {
    const response = await httpClient.patch<OrganizationResponse>(
      `/superadmin/organizations/${organizationId}`,
      payload,
    )
    return response.data
  },

  /** RF-03 + CA-00-02: invita al owner inicial; expira a las 72h. */
  async inviteOwner(
    organizationId: string,
    payload: InviteOwnerRequest,
  ): Promise<InvitationResponse> {
    const response = await httpClient.post<InvitationResponse>(
      `/superadmin/organizations/${organizationId}/invite-owner`,
      payload,
    )
    return response.data
  },

  /** RF-04 + CA-00-02: regenera token/expiración; la anterior queda revoked. */
  async resendInvitation(organizationId: string): Promise<InvitationResponse> {
    const response = await httpClient.post<InvitationResponse>(
      `/superadmin/organizations/${organizationId}/resend-invitation`,
    )
    return response.data
  },

  /** RF-05 + RN-05: sus miembros no pueden autenticarse ni renovar sesión. Auditado con motivo. */
  async disable(
    organizationId: string,
    payload: OrganizationStatusChangeRequest,
  ): Promise<OrganizationResponse> {
    const response = await httpClient.post<OrganizationResponse>(
      `/superadmin/organizations/${organizationId}/disable`,
      payload,
    )
    return response.data
  },

  /** RF-05 + RN-05: recupera acceso con sus datos intactos. Auditado con motivo. */
  async enable(
    organizationId: string,
    payload: OrganizationStatusChangeRequest,
  ): Promise<OrganizationResponse> {
    const response = await httpClient.post<OrganizationResponse>(
      `/superadmin/organizations/${organizationId}/enable`,
      payload,
    )
    return response.data
  },
}

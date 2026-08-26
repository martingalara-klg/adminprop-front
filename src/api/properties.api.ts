// src/api/properties.api.ts
//
// Cliente del módulo Propiedades — sdd_03 §7 "Propiedades" (v1.6):
//   GET    /properties                        GET    /properties/:id
//   POST   /properties                        PATCH  /properties/:id
//   DELETE /properties/:id
//   GET    /properties/:id/service-accounts    POST   /properties/:id/service-accounts
//   PATCH  /service-accounts/:id               DELETE /service-accounts/:id
//   GET    /properties/:id/work-orders         (historial de reparaciones — UC-16)
//   GET    /properties/:id/recurring-charges   POST   /properties/:id/recurring-charges
//
// CA-01-03: `DELETE /properties/:id` responde `409 ENTITY_HAS_DEPENDENCIES`
// si hay contrato activo — el cliente no decide esto, solo propaga el
// error (ver ConfirmDeleteButton + resolveErrorMessage).
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type PropertySummary = components['schemas']['PropertySummary']
export type PropertyDetail = components['schemas']['PropertyDetail']
export type PropertyCreate = components['schemas']['PropertyCreate']
export type PropertyUpdate = components['schemas']['PropertyUpdate']
export type PropertyListResponse = components['schemas']['PropertyListResponse']
export type PropertyResponse = components['schemas']['PropertyResponse']
export type PropertyDetailResponse = components['schemas']['PropertyDetailResponse']

export type PropertyServiceAccountDetail = components['schemas']['PropertyServiceAccountDetail']
export type PropertyServiceAccountCreate = components['schemas']['PropertyServiceAccountCreate']
export type PropertyServiceAccountUpdate = components['schemas']['PropertyServiceAccountUpdate']
export type PropertyServiceAccountListResponse =
  components['schemas']['PropertyServiceAccountListResponse']
export type PropertyServiceAccountResponse =
  components['schemas']['PropertyServiceAccountResponse']

export type PropertyWorkOrderHistoryEntry = components['schemas']['PropertyWorkOrderHistoryEntry']
export type PropertyWorkOrderHistoryResponse =
  components['schemas']['PropertyWorkOrderHistoryResponse']

export type RecurringChargeDetail = components['schemas']['RecurringChargeDetail']
export type RecurringChargeCreate = components['schemas']['RecurringChargeCreate']
export type RecurringChargeListResponse = components['schemas']['RecurringChargeListResponse']
export type RecurringChargeResponse = components['schemas']['RecurringChargeResponse']

export type PropertyListFilters = {
  cursor?: string
  limit?: number
  landlord_id?: string
  status?: 'available' | 'rented' | 'unavailable'
  property_type?: string
  search?: string
}

export const propertiesApi = {
  // ── Propiedades — RF-01 ────────────────────────────────────────────────
  async list(
    filters: PropertyListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<PropertyListResponse> {
    const response = await httpClient.get<PropertyListResponse>('/properties', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-03 + CA-01-05: ficha consolidada — datos + cuentas de servicio. */
  async get(propertyId: string, opts?: { signal?: AbortSignal }): Promise<PropertyDetailResponse> {
    const response = await httpClient.get<PropertyDetailResponse>(`/properties/${propertyId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-01 + CA-01-01: alta con dirección, propietario y tipo. */
  async create(payload: PropertyCreate): Promise<PropertyResponse> {
    const response = await httpClient.post<PropertyResponse>('/properties', payload)
    return response.data
  },

  /** RF-01: edición parcial — `status` solo acepta `available`/`unavailable` (RF-04). */
  async update(propertyId: string, payload: PropertyUpdate): Promise<PropertyResponse> {
    const response = await httpClient.patch<PropertyResponse>(
      `/properties/${propertyId}`,
      payload,
    )
    return response.data
  },

  /** RF-01 + CA-01-03: soft delete; `409 ENTITY_HAS_DEPENDENCIES` con contrato activo. */
  async remove(propertyId: string): Promise<void> {
    await httpClient.delete(`/properties/${propertyId}`)
  },

  // ── Cuentas de servicio — RF-02 ────────────────────────────────────────
  /** RF-02 + CA-01-02: todas las cuentas de la propiedad, vista única. */
  async listServiceAccounts(
    propertyId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<PropertyServiceAccountListResponse> {
    const response = await httpClient.get<PropertyServiceAccountListResponse>(
      `/properties/${propertyId}/service-accounts`,
      { signal: opts?.signal },
    )
    return response.data
  },

  /** RF-02 + CA-01-02: carga de cuenta (rentas/muni/luz/gas/agua/expensas/otro). */
  async createServiceAccount(
    propertyId: string,
    payload: PropertyServiceAccountCreate,
  ): Promise<PropertyServiceAccountResponse> {
    const response = await httpClient.post<PropertyServiceAccountResponse>(
      `/properties/${propertyId}/service-accounts`,
      payload,
    )
    return response.data
  },

  /** RF-02: `service_type` no editable — sólo número(s) y notas. */
  async updateServiceAccount(
    serviceAccountId: string,
    payload: PropertyServiceAccountUpdate,
  ): Promise<PropertyServiceAccountResponse> {
    const response = await httpClient.patch<PropertyServiceAccountResponse>(
      `/service-accounts/${serviceAccountId}`,
      payload,
    )
    return response.data
  },

  async deleteServiceAccount(serviceAccountId: string): Promise<void> {
    await httpClient.delete(`/service-accounts/${serviceAccountId}`)
  },

  // ── Ficha consolidada — RF-03 ───────────────────────────────────────────
  /** RF-03 + CA-01-05 (UC-16): historial de reparaciones de la propiedad. */
  async getWorkOrderHistory(
    propertyId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<PropertyWorkOrderHistoryResponse> {
    const response = await httpClient.get<PropertyWorkOrderHistoryResponse>(
      `/properties/${propertyId}/work-orders`,
      { signal: opts?.signal },
    )
    return response.data
  },

  /** RF-03 + CA-01-05: conceptos de cargos recurrentes activos de la propiedad. */
  async listRecurringCharges(
    propertyId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<RecurringChargeListResponse> {
    const response = await httpClient.get<RecurringChargeListResponse>(
      `/properties/${propertyId}/recurring-charges`,
      { signal: opts?.signal },
    )
    return response.data
  },

  async createRecurringCharge(
    propertyId: string,
    payload: RecurringChargeCreate,
  ): Promise<RecurringChargeResponse> {
    const response = await httpClient.post<RecurringChargeResponse>(
      `/properties/${propertyId}/recurring-charges`,
      payload,
    )
    return response.data
  },
}

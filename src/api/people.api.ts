// src/api/people.api.ts
//
// Cliente del módulo Personas — sdd_03 §5 "Propietarios (/landlords)" +
// §6 "Inquilinos (/renters)" (v1.6):
//   GET    /landlords                        GET    /landlords/:id
//   POST   /landlords                        PATCH  /landlords/:id
//   DELETE /landlords/:id
//   GET    /renters                          GET    /renters/:id
//   POST   /renters                          PATCH  /renters/:id
//   DELETE /renters/:id                      GET    /renters/:id/debt
//
// CA-02-02: `PATCH /landlords/:id` con `commission_pct` en el body exige
// además `landlord:set-commission` — el cliente no decide esto (el
// backend responde 403 FORBIDDEN igual si el actor no lo tiene); la UI
// solo evita mandar el campo cuando no corresponde (ver
// LandlordCommissionField).
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type LandlordSummary = components['schemas']['LandlordSummary']
export type LandlordDetail = components['schemas']['LandlordDetail']
export type LandlordCreate = components['schemas']['LandlordCreate']
export type LandlordUpdate = components['schemas']['LandlordUpdate']
export type LandlordListResponse = components['schemas']['LandlordListResponse']
export type LandlordResponse = components['schemas']['LandlordResponse']
export type LandlordPropertySummary = components['schemas']['LandlordPropertySummary']

export type RenterDetail = components['schemas']['RenterDetail']
export type RenterCreate = components['schemas']['RenterCreate']
export type RenterUpdate = components['schemas']['RenterUpdate']
export type RenterListResponse = components['schemas']['RenterListResponse']
export type RenterResponse = components['schemas']['RenterResponse']
export type RenterDebtResponse = components['schemas']['RenterDebtResponse']
export type DebtEntryData = components['schemas']['DebtEntryData']

export type ListPageFilters = { cursor?: string; limit?: number }

export const peopleApi = {
  // ── Propietarios (landlords) ──────────────────────────────────────────
  /** RF-01 §listado — CA-02-04: `bank_info` nunca viaja acá (LandlordSummary no lo declara). */
  async listLandlords(
    filters: ListPageFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<LandlordListResponse> {
    const response = await httpClient.get<LandlordListResponse>('/landlords', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-02 — ficha: `bank_info` descifrado + propiedades (CA-02-04). */
  async getLandlord(
    landlordId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<LandlordResponse> {
    const response = await httpClient.get<LandlordResponse>(`/landlords/${landlordId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-01 + CA-02-01: `commission_pct` obligatorio desde el alta. */
  async createLandlord(payload: LandlordCreate): Promise<LandlordResponse> {
    const response = await httpClient.post<LandlordResponse>('/landlords', payload)
    return response.data
  },

  /**
   * RF-01 + CA-02-02/03: si `payload` incluye `commission_pct`, el actor
   * necesita `landlord:set-commission` — sin él, 403 FORBIDDEN aunque
   * tenga `landlord:manage`. La UI omite el campo del payload cuando el
   * usuario no tiene el permiso (ver useUpdateLandlord).
   */
  async updateLandlord(landlordId: string, payload: LandlordUpdate): Promise<LandlordResponse> {
    const response = await httpClient.patch<LandlordResponse>(`/landlords/${landlordId}`, payload)
    return response.data
  },

  /** RF-01 + CA-02-06: soft delete; `409 ENTITY_HAS_DEPENDENCIES` con propiedades activas. */
  async deleteLandlord(landlordId: string): Promise<void> {
    await httpClient.delete(`/landlords/${landlordId}`)
  },

  // ── Inquilinos (renters) ──────────────────────────────────────────────
  /** RF-03 §listado. */
  async listRenters(
    filters: ListPageFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<RenterListResponse> {
    const response = await httpClient.get<RenterListResponse>('/renters', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-04 — datos del inquilino (el estado de deuda vive en getRenterDebt). */
  async getRenter(renterId: string, opts?: { signal?: AbortSignal }): Promise<RenterResponse> {
    const response = await httpClient.get<RenterResponse>(`/renters/${renterId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-03: alta de inquilino. */
  async createRenter(payload: RenterCreate): Promise<RenterResponse> {
    const response = await httpClient.post<RenterResponse>('/renters', payload)
    return response.data
  },

  /** RF-03: edición de datos de contacto. */
  async updateRenter(renterId: string, payload: RenterUpdate): Promise<RenterResponse> {
    const response = await httpClient.patch<RenterResponse>(`/renters/${renterId}`, payload)
    return response.data
  },

  /** RF-03 + CA-02-06: soft delete; `409 ENTITY_HAS_DEPENDENCIES` con contrato vigente. */
  async deleteRenter(renterId: string): Promise<void> {
    await httpClient.delete(`/renters/${renterId}`)
  },

  /**
   * RF-04 + CA-02-05: períodos adeudados por contrato, saldo, días de
   * mora e interés sugerido acumulado. Sin `meta` — conjunto acotado por
   * inquilino (ver `RenterDebtResponse` en `generated/types.ts`).
   */
  async getRenterDebt(
    renterId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<RenterDebtResponse> {
    const response = await httpClient.get<RenterDebtResponse>(`/renters/${renterId}/debt`, {
      signal: opts?.signal,
    })
    return response.data
  },
}

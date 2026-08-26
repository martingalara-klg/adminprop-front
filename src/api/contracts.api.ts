// src/api/contracts.api.ts
//
// Cliente del módulo Contratos — sdd_03 §8 "Contratos" (v1.6). El #10
// (Propiedades) sólo necesitaba `list` para resolver el "contrato
// vigente" de la ficha consolidada de una propiedad (CA-01-05:
// `GET /contracts?property_id=&status=active`). Este PR (#11, Contratos
// UI) agrega el resto del dominio: alta, ciclo de vida, y la bandeja de
// ajustes por índice.
//
//   GET    /contracts                        (?status=&expiring_in_days=)
//   POST   /contracts                        (valida CONTRACT_OVERLAP, RN-C02)
//   GET    /contracts/:id
//   PATCH  /contracts/:id                    (solo notes/end_date; montos NUNCA — RN-C04)
//   POST   /contracts/:id/activate           (draft → active)
//   POST   /contracts/:id/terminate           (active → terminated; body: { reason })
//   GET    /contracts/:id/adjustments        (historial de ajustes)
//   GET    /adjustments                      (?status=pending — bandeja)
//   POST   /adjustments/:id/apply            (body: { pct })
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type ContractSummary = components['schemas']['ContractSummary']
export type ContractCreate = components['schemas']['ContractCreate']
export type ContractUpdate = components['schemas']['ContractUpdate']
export type ContractTerminateRequest = components['schemas']['ContractTerminateRequest']
export type ContractListResponse = components['schemas']['ContractListResponse']
export type ContractResponse = components['schemas']['ContractResponse']

export type AdjustmentSummary = components['schemas']['AdjustmentSummary']
export type AdjustmentApplyRequest = components['schemas']['AdjustmentApplyRequest']
export type AdjustmentListResponse = components['schemas']['AdjustmentListResponse']
export type AdjustmentResponse = components['schemas']['AdjustmentResponse']

export type ContractListFilters = {
  cursor?: string
  limit?: number
  status?: 'draft' | 'active' | 'terminated' | 'expired'
  property_id?: string
  renter_id?: string
  currency?: string
  expiring_in_days?: number
}

export const contractsApi = {
  // ── RF-01 — Listado y consulta ──────────────────────────────────────────
  async list(
    filters: ContractListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<ContractListResponse> {
    const response = await httpClient.get<ContractListResponse>('/contracts', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  async get(contractId: string, opts?: { signal?: AbortSignal }): Promise<ContractResponse> {
    const response = await httpClient.get<ContractResponse>(`/contracts/${contractId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  // ── RF-02 — Alta ─────────────────────────────────────────────────────────
  /**
   * CA-03-01: ARS con % de mora, frecuencia e índice de ajuste; nace en
   * `draft` (RN-02). CA-03-02/03: el backend valida solapamiento
   * (409 CONTRACT_OVERLAP) y USD sin ajuste (400 VALIDATION_ERROR).
   */
  async create(payload: ContractCreate): Promise<ContractResponse> {
    const response = await httpClient.post<ContractResponse>('/contracts', payload)
    return response.data
  },

  /** RF-03: sólo `notes`/`end_date` — `current_amount` siempre 422 (RN-C04). */
  async update(contractId: string, payload: ContractUpdate): Promise<ContractResponse> {
    const response = await httpClient.patch<ContractResponse>(
      `/contracts/${contractId}`,
      payload,
    )
    return response.data
  },

  // ── RF-03 — Ciclo de vida ──────────────────────────────────────────────
  /** CA-03-01/02: `draft → active`; revalida solapamiento (409 CONTRACT_OVERLAP). */
  async activate(contractId: string): Promise<ContractResponse> {
    const response = await httpClient.post<ContractResponse>(`/contracts/${contractId}/activate`)
    return response.data
  },

  /** CA-03-08: `active → terminated` con motivo; la propiedad vuelve a `available`. */
  async terminate(
    contractId: string,
    payload: ContractTerminateRequest,
  ): Promise<ContractResponse> {
    const response = await httpClient.post<ContractResponse>(
      `/contracts/${contractId}/terminate`,
      payload,
    )
    return response.data
  },

  // ── RF-04 — Ajustes por índice ──────────────────────────────────────────
  /** RF-04 paso 5: historial completo de ajustes del contrato. */
  async listAdjustments(
    contractId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<AdjustmentListResponse> {
    const response = await httpClient.get<AdjustmentListResponse>(
      `/contracts/${contractId}/adjustments`,
      { signal: opts?.signal },
    )
    return response.data
  },

  /** RF-04 paso 3, CA-03-04: bandeja de ajustes pendientes — `?status=pending`. */
  async listPendingAdjustments(
    opts?: { signal?: AbortSignal },
  ): Promise<AdjustmentListResponse> {
    const response = await httpClient.get<AdjustmentListResponse>('/adjustments', {
      params: { status: 'pending' },
      signal: opts?.signal,
    })
    return response.data
  },

  /**
   * RF-04 paso 4, CA-03-05: `pending → applied`. `pct` puede ser
   * negativo (deflación/renegociación) — la confirmación explícita del
   * operador vive en la UI (decisión #112), nunca se omite acá.
   */
  async applyAdjustment(
    adjustmentId: string,
    payload: AdjustmentApplyRequest,
  ): Promise<AdjustmentResponse> {
    const response = await httpClient.post<AdjustmentResponse>(
      `/adjustments/${adjustmentId}/apply`,
      payload,
    )
    return response.data
  },
}

// src/api/settlements.api.ts
//
// Cliente del módulo Liquidaciones — sdd_03 §11 "Liquidaciones"
// (v1.6/v1.7):
//   GET    /settlements                      (?period=&landlord_id=&status=)
//   POST   /settlements/generate             → 202 (SETTLEMENT_EXCHANGE_RATE_REQUIRED / SETTLEMENT_ALREADY_EXISTS)
//   GET    /settlements/:id                  (?scope=consolidated|per_property)
//   POST   /settlements/:id/regenerate       → 202 (regenerated_count++ — RN-L03)
//   POST   /settlements/:id/issue            (draft → issued)
//   GET    /settlements/:id/export           (?format=xlsx|pdf — Fetch+Blob)
//
// El job de generación/regeneración corre en `documents_worker`; el
// estado se lee SIEMPRE por el mismo `GET /settlements/:id`
// (`job_status`, decisión #29 — Redis, un solo endpoint para el
// polling, ver `useSettlementStatus`).
import { httpClient } from './http-client'
import { downloadFile } from './download'
import type { components } from './generated/types'

export type SettlementSummary = components['schemas']['SettlementSummary']
export type SettlementDetail = components['schemas']['SettlementDetail']
export type SettlementListResponse = components['schemas']['SettlementListResponse']
export type SettlementResponse = components['schemas']['SettlementResponse']
export type SettlementLineItemDetail = components['schemas']['SettlementLineItemDetail']
export type SettlementPropertyGroup = components['schemas']['SettlementPropertyGroup']
export type SettlementAttachmentSummary = components['schemas']['SettlementAttachmentSummary']
export type SettlementGenerateRequest = components['schemas']['SettlementGenerateRequest']
export type SettlementGenerateAccepted = components['schemas']['SettlementGenerateAccepted']
export type SettlementRegenerateRequest = components['schemas']['SettlementRegenerateRequest']
export type SettlementRegenerateAccepted = components['schemas']['SettlementRegenerateAccepted']

export type SettlementListFilters = {
  period?: string // YYYY-MM
  landlord_id?: string
  status?: 'draft' | 'issued'
}

export type SettlementScope = 'consolidated' | 'per_property'

export const settlementsApi = {
  /** RF-01: listado filtrable — sin paginar (volumen mensual acotado). */
  async list(
    filters: SettlementListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<SettlementListResponse> {
    const response = await httpClient.get<SettlementListResponse>('/settlements', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /**
   * RF-01 (wizard, paso `confirmation`): dispara el cálculo asíncrono.
   * `400 SETTLEMENT_EXCHANGE_RATE_REQUIRED` si hay USD en el período y
   * falta `exchange_rate` (RN-L06); `409 SETTLEMENT_ALREADY_EXISTS` si ya
   * hay una para `(landlord_id, period)` (RN-05).
   */
  async generate(payload: SettlementGenerateRequest): Promise<SettlementGenerateAccepted> {
    const response = await httpClient.post<SettlementGenerateAccepted>(
      '/settlements/generate',
      payload,
    )
    return response.data
  },

  /**
   * RF-02/RF-04: detalle con totales + line items + `job_status` (el
   * mismo endpoint que el polling de `generate`/`regenerate`, decisión
   * #29). `scope=per_property` agrega `property_groups` (RF-04).
   */
  async get(
    settlementId: string,
    opts?: { signal?: AbortSignal; scope?: SettlementScope },
  ): Promise<SettlementResponse> {
    const response = await httpClient.get<SettlementResponse>(`/settlements/${settlementId}`, {
      params: opts?.scope ? { scope: opts.scope } : undefined,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-03 + RN-L03: recalcula con datos corregidos; TC nuevo opcional. */
  async regenerate(
    settlementId: string,
    payload: SettlementRegenerateRequest = {},
  ): Promise<SettlementRegenerateAccepted> {
    const response = await httpClient.post<SettlementRegenerateAccepted>(
      `/settlements/${settlementId}/regenerate`,
      payload,
    )
    return response.data
  },

  /** RF-03: `draft → issued`. */
  async issue(settlementId: string): Promise<SettlementResponse> {
    const response = await httpClient.post<SettlementResponse>(
      `/settlements/${settlementId}/issue`,
    )
    return response.data
  },

  /** RF-03: exports Excel/PDF ya generados — Fetch + Blob, nunca `window.open`. */
  async downloadExport(settlementId: string, format: 'xlsx' | 'pdf'): Promise<void> {
    const extension = format === 'xlsx' ? 'xlsx' : 'pdf'
    await downloadFile(
      `/settlements/${settlementId}/export?format=${format}`,
      `liquidacion-${settlementId}.${extension}`,
    )
  },
}

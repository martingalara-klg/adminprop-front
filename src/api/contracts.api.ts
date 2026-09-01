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
//   GET    /contracts/:id                    (incluye monthly_amounts[] — issue #106/#56)
//   PATCH  /contracts/:id                    (solo notes/end_date; montos NUNCA — RN-C04)
//   POST   /contracts/:id/activate           (draft → active)
//   POST   /contracts/:id/terminate           (active → terminated; body: { reason }; permiso contract:terminate — issue #105/#56)
//   DELETE /contracts/:id                     (borrado lógico en cualquier estado; permiso contract:delete — issue #124/#86)
//   GET    /contracts/:id/adjustments        (historial de ajustes)
//   GET    /adjustments                      (?status=pending — bandeja)
//   POST   /adjustments/:id/apply            (body: { pct })
//   POST   /contracts/:id/debt-certificate   (libre deuda del contrato, PDF — issue #104/#56;
//                                              reemplaza a POST /renters/:id/debt-certificate,
//                                              eliminado del backend)
import { httpClient } from './http-client'
import { downloadFile } from './download'
import type { components } from './generated/types'

export type ContractSummary = components['schemas']['ContractSummary']
export type ContractDetail = components['schemas']['ContractDetail']
export type ContractCreate = components['schemas']['ContractCreate']
export type ContractUpdate = components['schemas']['ContractUpdate']
export type ContractTerminateRequest = components['schemas']['ContractTerminateRequest']
export type ContractListResponse = components['schemas']['ContractListResponse']
export type ContractResponse = components['schemas']['ContractResponse']
export type ContractDetailResponse = components['schemas']['ContractDetailResponse']
export type MonthlyAmount = components['schemas']['MonthlyAmount']

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

  /** v1.12 (issue #106): incluye `monthly_amounts[]` — valor locativo mes a mes, más reciente primero. */
  async get(contractId: string, opts?: { signal?: AbortSignal }): Promise<ContractDetailResponse> {
    const response = await httpClient.get<ContractDetailResponse>(`/contracts/${contractId}`, {
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

  /**
   * Issue #86 (back#124, decisión #130, sdd_03 v1.17 — RF-07/RN-C08):
   * borrado LÓGICO en cualquier estado, incluso `active` (la propiedad
   * vuelve a `available` y se detiene la generación de períodos futuros;
   * cobros y liquidaciones ya emitidos quedan intactos). `204 No
   * Content`, sin body. Permiso `contract:delete` (solo owner).
   */
  async remove(contractId: string): Promise<void> {
    await httpClient.delete(`/contracts/${contractId}`)
  },

  // ── Libre deuda del contrato (Fetch + Blob, POST) ────────────────────────
  /**
   * Issue #104/#56, decisión #123: reemplaza a `POST /renters/:id/debt-certificate`
   * (eliminado) — el libre deuda es por CONTRATO, verifica sólo los
   * períodos de ese contrato. `422 CONTRACT_HAS_DEBT` con el detalle de
   * lo adeudado en `details`. Permiso `contract:read`.
   */
  async downloadDebtCertificate(contractId: string): Promise<void> {
    await downloadFile(`/contracts/${contractId}/debt-certificate`, `libre-deuda-${contractId}.pdf`, {
      method: 'POST',
    })
  },
}

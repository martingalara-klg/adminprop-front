// src/api/payments.api.ts
//
// Cliente del módulo Cobranzas — sdd_03 §9 "Cobranzas" (v1.7):
//
//   GET  /rent-periods                        (?period=YYYY-MM&status=&in_arrears=&property_id=&landlord_id=&renter_id= — panel del mes, RF-02)
//   GET  /rent-periods/:id                    (v1.7, issue #87: incluye `payments[]` — historial completo, anulados incluidos)
//   GET  /rent-periods/:id/interest-preview    (?payment_date= — RF-04, RN-P02/P03)
//   POST /rent-periods/:id/payments            (registrar cobro — RN-P04/P05/P06/P07)
//   POST /payments/:id/void                    (anulación lógica con motivo — RN-D04)
//   GET  /payments/:id/receipt                 (descarga PDF del recibo — RF-07)
//   GET  /debt                                 (?landlord_id=&renter_id=&min_days= — estado de deuda global, RF-06)
//
// Issue #104/#56: `POST /renters/:id/debt-certificate` (RF-08) fue
// ELIMINADO del backend — el libre deuda pasó a ser por CONTRATO
// (`POST /contracts/:id/debt-certificate`, ver `contracts.api.ts`). No
// reintroducir este endpoint acá.
//
// No existe `GET /payments` en sdd_03 §9: `GET /rent-periods/:id` (v1.7)
// es la única vía para conocer el `id` de cobros previos — por eso el
// historial del período (issue #33) es la superficie desde la que se
// ofrece "Descargar recibo" y "Anular cobro" por fila, ya no sólo sobre
// el cobro recién registrado en la sesión (limitación del #12).
import { httpClient } from './http-client'
import { downloadFile } from './download'
import type { components } from './generated/types'

export type RentPeriodSummary = components['schemas']['RentPeriodSummary']
export type RentPeriodListResponse = components['schemas']['RentPeriodListResponse']
export type RentPeriodDetail = components['schemas']['RentPeriodDetail']
export type RentPeriodDetailResponse = components['schemas']['RentPeriodDetailResponse']
export type InterestPreviewData = components['schemas']['InterestPreviewData']
export type PaymentCreate = components['schemas']['PaymentCreate']
export type PaymentSummary = components['schemas']['PaymentSummary']
export type PaymentResponse = components['schemas']['PaymentResponse']
export type PaymentDetail = components['schemas']['PaymentDetail']
export type PaymentVoidRequest = components['schemas']['PaymentVoidRequest']
export type PaymentVoidResponse = components['schemas']['PaymentVoidResponse']
export type DebtEntryData = components['schemas']['DebtEntryData']
export type DebtListResponse = components['schemas']['DebtListResponse']

export type RentPeriodListFilters = {
  period?: string // YYYY-MM
  status?: 'pending' | 'partial' | 'paid'
  in_arrears?: boolean
  property_id?: string
  landlord_id?: string
  renter_id?: string
  cursor?: string
  limit?: number
}

export type DebtListFilters = {
  landlord_id?: string
  renter_id?: string
  min_days?: number
  cursor?: string
  limit?: number
}

export const paymentsApi = {
  // ── RF-02 — Panel de cobranzas del mes ──────────────────────────────────
  async listRentPeriods(
    filters: RentPeriodListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<RentPeriodListResponse> {
    const response = await httpClient.get<RentPeriodListResponse>('/rent-periods', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** v1.7 (issue #87): incluye `payments[]` — historial del período, anulados incluidos. */
  async getRentPeriod(
    rentPeriodId: string,
    opts?: { signal?: AbortSignal },
  ): Promise<RentPeriodDetailResponse> {
    const response = await httpClient.get<RentPeriodDetailResponse>(
      `/rent-periods/${rentPeriodId}`,
      { signal: opts?.signal },
    )
    return response.data
  },

  // ── RF-04 — Mora sugerida ────────────────────────────────────────────────
  /** RN-P02/P03: interés sugerido al `paymentDate` sobre el saldo impago. */
  async interestPreview(
    rentPeriodId: string,
    paymentDate: string,
    opts?: { signal?: AbortSignal },
  ): Promise<InterestPreviewData> {
    const response = await httpClient.get<{ data: InterestPreviewData }>(
      `/rent-periods/${rentPeriodId}/interest-preview`,
      { params: { payment_date: paymentDate }, signal: opts?.signal },
    )
    return response.data.data
  },

  // ── RF-03 — Registro de cobro ────────────────────────────────────────────
  /**
   * CA-04-03/04/05/06: fecha, medio, moneda, importe a capital, TC si
   * difiere (400 EXCHANGE_RATE_REQUIRED), destino, interés cobrado
   * (imputación libre, RN-P04) y notas. `422
   * PAYMENT_EXCEEDS_CONTRACT_BALANCE` si el importe excede el saldo.
   */
  async registerPayment(
    rentPeriodId: string,
    payload: PaymentCreate,
  ): Promise<PaymentResponse> {
    const response = await httpClient.post<PaymentResponse>(
      `/rent-periods/${rentPeriodId}/payments`,
      payload,
    )
    return response.data
  },

  // ── RF-05 — Anulación ────────────────────────────────────────────────────
  /** CA-04-07: motivo obligatorio; `409 PAYMENT_ALREADY_VOIDED` en la segunda anulación. */
  async voidPayment(paymentId: string, payload: PaymentVoidRequest): Promise<PaymentVoidResponse> {
    const response = await httpClient.post<PaymentVoidResponse>(
      `/payments/${paymentId}/void`,
      payload,
    )
    return response.data
  },

  // ── RF-06 — Estado de deuda global ───────────────────────────────────────
  async listDebt(
    filters: DebtListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<DebtListResponse> {
    const response = await httpClient.get<DebtListResponse>('/debt', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  // ── RF-07 — Recibo de cobro (Fetch + Blob) ───────────────────────────────
  /** CA-04-10: sobre un cobro anulado, el backend responde 422 BUSINESS_RULE_VIOLATION (RN-P08). */
  async downloadReceipt(paymentId: string): Promise<void> {
    await downloadFile(`/payments/${paymentId}/receipt`, `recibo-${paymentId}.pdf`)
  },
}

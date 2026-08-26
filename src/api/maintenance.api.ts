// src/api/maintenance.api.ts
//
// Cliente del módulo Mantenimiento — sdd_03 §12 "Mantenimiento" (v1.6):
//   GET    /work-orders                      (?status=&property_id= — maintenance ve todos los de la org)
//   POST   /work-orders                      (work-order:create — owner/admin; payer obligatorio; notifica a maintenance)
//   GET    /work-orders/:id
//   POST   /work-orders/:id/quotes           (work-order:quote — maintenance/admin; notifica a owner+admin)
//   POST   /quotes/:id/approve               (work-order:approve — owner/admin; open → in_progress; las demás quotes → discarded)
//   POST   /work-orders/:id/close            (work-order:close — maintenance/admin; body: { final_cost? }; notifica)
//   POST   /work-orders/:id/cancel           (work-order:cancel — owner/admin)
//   POST   /work-orders/:id/attachments      (fotos; también sobre quotes: POST /quotes/:id/attachments)
//   GET    /attachments/:id/download
//
// Errores del catálogo (sdd_03 §"Códigos de Error Globales" — Mantenimiento):
//   409 QUOTE_ALREADY_APPROVED · 409 WORK_ORDER_ALREADY_CLOSED · 422 WORK_ORDER_ALREADY_SETTLED
//
// Único módulo accesible para el rol `maintenance` (RN-A01) — sólo
// `work-order:read` / `work-order:quote` / `work-order:close` +
// `attachment:manage` (ver adminprop-back
// modules/superadmin/provisioning.py.MAINTENANCE_PERMISSIONS). El
// gating de botones vive en las pages (usePermission), no acá.
import { httpClient, API_BASE } from './http-client'
import type { components } from './generated/types'

export type WorkOrderSummary = components['schemas']['WorkOrderSummary']
export type WorkOrderDetail = components['schemas']['WorkOrderDetail']
export type WorkOrderCreate = components['schemas']['WorkOrderCreate']
export type WorkOrderCloseRequest = components['schemas']['WorkOrderCloseRequest']
export type WorkOrderCancelRequest = components['schemas']['WorkOrderCancelRequest']
export type WorkOrderListResponse = components['schemas']['WorkOrderListResponse']
export type WorkOrderResponse = components['schemas']['WorkOrderResponse']
export type WorkOrderDetailResponse = components['schemas']['WorkOrderDetailResponse']

export type WorkOrderQuoteCreate = components['schemas']['WorkOrderQuoteCreate']
export type WorkOrderQuoteSummary = components['schemas']['WorkOrderQuoteSummary']
export type WorkOrderQuoteResponse = components['schemas']['WorkOrderQuoteResponse']
export type WorkOrderApproveResponse = components['schemas']['WorkOrderApproveResponse']

export type AttachmentSummary = components['schemas']['AttachmentSummary']

export type WorkOrderListFilters = {
  status?: 'open' | 'in_progress' | 'closed' | 'cancelled'
  property_id?: string
}

export const maintenanceApi = {
  // ── Pedidos de reparación — RF-01 ───────────────────────────────────────
  /** RF-01/CA-06-01: maintenance ve todos los pedidos de la org (sin filtrar por asignación — RN-03). */
  async list(
    filters: WorkOrderListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<WorkOrderListResponse> {
    const response = await httpClient.get<WorkOrderListResponse>('/work-orders', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-02: cotizaciones + adjuntos del pedido en la misma respuesta. */
  async get(workOrderId: string, opts?: { signal?: AbortSignal }): Promise<WorkOrderDetailResponse> {
    const response = await httpClient.get<WorkOrderDetailResponse>(`/work-orders/${workOrderId}`, {
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-01/CA-06-01: owner/admin crean el pedido — payer obligatorio; notifica a maintenance. */
  async create(payload: WorkOrderCreate): Promise<WorkOrderResponse> {
    const response = await httpClient.post<WorkOrderResponse>('/work-orders', payload)
    return response.data
  },

  /** RF-04/CA-06-04: marca terminado; `final_cost` ajustable. 409 WORK_ORDER_ALREADY_CLOSED si ya cerrado. */
  async close(workOrderId: string, payload: WorkOrderCloseRequest): Promise<WorkOrderResponse> {
    const response = await httpClient.post<WorkOrderResponse>(
      `/work-orders/${workOrderId}/close`,
      payload,
    )
    return response.data
  },

  /** RF-05/CA-06-07: cancela con motivo. 422 WORK_ORDER_ALREADY_SETTLED si ya liquidado. */
  async cancel(workOrderId: string, payload: WorkOrderCancelRequest): Promise<WorkOrderResponse> {
    const response = await httpClient.post<WorkOrderResponse>(
      `/work-orders/${workOrderId}/cancel`,
      payload,
    )
    return response.data
  },

  /** RF-01/RF-04: fotos del pedido (alta o cierre) — mismo endpoint (RN-05). Multipart. */
  async uploadWorkOrderAttachment(workOrderId: string, file: File): Promise<WorkOrderResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<WorkOrderResponse>(
      `/work-orders/${workOrderId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  // ── Cotizaciones — RF-02/RF-03 ──────────────────────────────────────────
  /** RF-02/CA-06-02: sube una cotización — notifica a owner+admin. */
  async addQuote(workOrderId: string, payload: WorkOrderQuoteCreate): Promise<WorkOrderQuoteResponse> {
    const response = await httpClient.post<WorkOrderQuoteResponse>(
      `/work-orders/${workOrderId}/quotes`,
      payload,
    )
    return response.data
  },

  /** RF-02/CA-06-02: fotos de la cotización. Multipart. */
  async uploadQuoteAttachment(quoteId: string, file: File): Promise<WorkOrderQuoteResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<WorkOrderQuoteResponse>(
      `/quotes/${quoteId}/attachments`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  /** RF-03/CA-06-03: open → in_progress, las demás quedan discarded. 409 QUOTE_ALREADY_APPROVED si reaprobar. */
  async approveQuote(quoteId: string): Promise<WorkOrderApproveResponse> {
    const response = await httpClient.post<WorkOrderApproveResponse>(`/quotes/${quoteId}/approve`)
    return response.data
  },
}

/**
 * URL absoluta de descarga de un adjunto — RN-05: el acceso hereda los
 * permisos del pedido; auth por cookie HttpOnly (no query param de token).
 * Usado por `useAttachmentImage` (fetch + blob) y nunca con
 * `window.open`/`<a href>` directo (docs/skills/api-client.md).
 */
export function attachmentDownloadUrl(attachmentId: string): string {
  return `${API_BASE}/attachments/${attachmentId}/download`
}

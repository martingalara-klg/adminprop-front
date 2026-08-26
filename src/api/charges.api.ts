// src/api/charges.api.ts
//
// Cliente del checklist mensual de cargos — sdd_03 §10 "Cargos del mes"
// (v1.6):
//   PATCH  /recurring-charges/:id            (label, is_active)
//   POST   /recurring-charges/:id/entries    (body: { period, amount, notes } — CHARGE_ENTRY_ALREADY_EXISTS si duplicado)
//   GET    /charge-entries                   (?period=YYYY-MM — verificación mensual)
//   PATCH  /charge-entries/:id               (corrección auditada)
//
// El ABM del concepto (RecurringCharge) — alta y listado por propiedad —
// vive en `properties.api.ts` (issue #10, `GET/POST
// /properties/:id/recurring-charges`); este cliente cubre la carga
// mensual del IMPORTE (ChargeEntry) y el checklist de verificación
// (spec_module_05_liquidaciones.md §RF-05), que es el alcance de #14.
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type ChargeVerificationItem = components['schemas']['ChargeVerificationItem']
export type ChargeVerificationResponse = components['schemas']['ChargeVerificationResponse']
export type ChargeEntryDetail = components['schemas']['ChargeEntryDetail']
export type ChargeEntryResponse = components['schemas']['ChargeEntryResponse']
export type ChargeEntryCreate = components['schemas']['ChargeEntryCreate']
export type ChargeEntryUpdate = components['schemas']['ChargeEntryUpdate']

export const chargesApi = {
  /**
   * RF-05 + CA-05-08: checklist mensual — una fila por concepto activo,
   * `has_entry` discrimina "propiedad con cargo cargado" de "propiedad
   * que falta". `period` es obligatorio (YYYY-MM).
   */
  async listChargeEntries(
    period: string,
    opts?: { signal?: AbortSignal },
  ): Promise<ChargeVerificationResponse> {
    const response = await httpClient.get<ChargeVerificationResponse>('/charge-entries', {
      params: { period },
      signal: opts?.signal,
    })
    return response.data
  },

  /**
   * RF-05: carga del importe del mes para un concepto recurrente.
   * `409 CHARGE_ENTRY_ALREADY_EXISTS` si ya existe un cargo para ese
   * `(recurring_charge_id, period)` — corrección vía `updateChargeEntry`.
   */
  async createChargeEntry(
    recurringChargeId: string,
    payload: ChargeEntryCreate,
  ): Promise<ChargeEntryResponse> {
    const response = await httpClient.post<ChargeEntryResponse>(
      `/recurring-charges/${recurringChargeId}/entries`,
      payload,
    )
    return response.data
  },

  /** RN-D04: corrección auditada del importe/notas — `period` es inmutable. */
  async updateChargeEntry(
    chargeEntryId: string,
    payload: ChargeEntryUpdate,
  ): Promise<ChargeEntryResponse> {
    const response = await httpClient.patch<ChargeEntryResponse>(
      `/charge-entries/${chargeEntryId}`,
      payload,
    )
    return response.data
  },
}

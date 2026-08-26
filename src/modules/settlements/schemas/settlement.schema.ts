// src/modules/settlements/schemas/settlement.schema.ts
//
// Zod schemas — subset de las invariantes del backend
// (spec_module_05_liquidaciones.md §Validaciones). El backend es la
// fuente autoritativa (`400 SETTLEMENT_EXCHANGE_RATE_REQUIRED`,
// `409 CHARGE_ENTRY_ALREADY_EXISTS`); estos schemas sólo dan feedback
// inmediato.
//
// §Validaciones:
//   period: mes válido no futuro (YYYY-MM).
//   exchange_rate > 0 cuando se provee.
import { z } from 'zod'

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

const periodField = z
  .string()
  .regex(/^\d{4}-\d{2}$/, 'El período debe tener el formato AAAA-MM.')
  .refine((value) => value <= currentPeriod(), 'El período no puede ser futuro.')

// RF-05: carga del importe mensual de un concepto recurrente (ChargeEntry).
export const chargeEntrySchema = z.object({
  amount: z
    .string()
    .min(1, 'El importe es obligatorio.')
    .refine((value) => Number(value) > 0, 'El importe debe ser mayor a 0.'),
  notes: z.string().optional().or(z.literal('')),
})
export type ChargeEntryInput = z.infer<typeof chargeEntrySchema>

// Wizard paso 1 — select_period: elegir propietario y período.
export const selectPeriodSchema = z.object({
  landlord_id: z.string().min(1, 'Seleccioná un propietario.'),
  period: periodField,
})
export type SelectPeriodInput = z.infer<typeof selectPeriodSchema>

// Wizard paso 3 — exchange_rate: TC manual (sólo si hay montos USD, RN-L06).
// `400 SETTLEMENT_EXCHANGE_RATE_REQUIRED` del backend es la fuente
// autoritativa; este schema da feedback inmediato cuando el paso aplica.
export const exchangeRateSchema = z.object({
  exchange_rate: z
    .string()
    .min(1, 'Se requiere el tipo de cambio para generar la liquidación en USD.')
    .refine((value) => Number(value) > 0, 'El tipo de cambio debe ser mayor a 0.'),
})
export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>

// Regeneración (RF-03/RN-L03): TC nuevo opcional — si no viene, se
// mantiene el de la liquidación.
export const regenerateSettlementSchema = z.object({
  exchange_rate: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => !value || Number(value) > 0,
      'El tipo de cambio debe ser mayor a 0.',
    ),
})
export type RegenerateSettlementInput = z.infer<typeof regenerateSettlementSchema>

// RF-01: filtros del listado de liquidaciones.
export const SETTLEMENT_STATUS_OPTIONS = ['draft', 'issued'] as const
export const SETTLEMENT_STATUS_LABELS: Record<(typeof SETTLEMENT_STATUS_OPTIONS)[number], string> = {
  draft: 'Borrador',
  issued: 'Emitida',
}

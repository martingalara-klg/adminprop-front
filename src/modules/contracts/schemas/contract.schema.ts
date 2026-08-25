// src/modules/contracts/schemas/contract.schema.ts
//
// Zod schemas — subset de las invariantes del backend
// (spec_module_03_contratos.md §"Validaciones"). El backend valida el
// total (RN-01..RN-07); estos schemas sólo dan feedback inmediato.
//
// §Validaciones:
//   initial_amount > 0; end_date > start_date; duración máxima ≤ 10 años.
//   adjustment_frequency_months entero > 0 (sólo ARS); adjustment_index
//   obligatorio si hay frecuencia; adjustment_index_notes obligatoria si
//   el índice es "otro".
//   pct del ajuste: decimal, puede ser negativo — confirmación explícita
//   en UI si < 0 (decisión #112); tope de sanidad ±500%.
import { z } from 'zod'

export const CONTRACT_CURRENCY_OPTIONS = ['ARS', 'USD'] as const

export const ADJUSTMENT_INDEX_OPTIONS = ['icl', 'ipc_cordoba', 'otro'] as const

export const ADJUSTMENT_INDEX_LABELS: Record<(typeof ADJUSTMENT_INDEX_OPTIONS)[number], string> =
  {
    icl: 'ICL',
    ipc_cordoba: 'IPC Córdoba',
    otro: 'Otro',
  }

const propertyIdField = z.string().min(1, 'Seleccioná una propiedad.')
const renterIdField = z.string().min(1, 'Seleccioná un inquilino.')

const initialAmountField = z
  .string()
  .min(1, 'El monto inicial es obligatorio.')
  .refine((value) => Number(value) > 0, 'El monto inicial debe ser mayor a 0.')

const dailyLateFeePctField = z
  .string()
  .min(1, 'El % de mora diaria es obligatorio.')
  .refine((value) => Number(value) >= 0, 'El % de mora diaria debe ser mayor o igual a 0.')

// RF-02 + CA-03-01/02/03: alta de contrato. USD (RN-03) no acepta
// frecuencia/índice de ajuste — el form los omite dinámicamente y este
// schema los rechaza si igualmente llegaran con currency=USD.
export const createContractSchema = z
  .object({
    property_id: propertyIdField,
    renter_id: renterIdField,
    currency: z.enum(CONTRACT_CURRENCY_OPTIONS),
    initial_amount: initialAmountField,
    start_date: z.string().min(1, 'La fecha de inicio es obligatoria.'),
    end_date: z.string().min(1, 'La fecha de fin es obligatoria.'),
    daily_late_fee_pct: dailyLateFeePctField,
    adjustment_frequency_months: z.string().optional().or(z.literal('')),
    adjustment_index: z.enum(ADJUSTMENT_INDEX_OPTIONS).optional().or(z.literal('')),
    adjustment_index_notes: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((values, ctx) => {
    if (values.end_date && values.start_date && values.end_date <= values.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.',
        path: ['end_date'],
      })
    }

    if (values.currency === 'ARS') {
      if (values.adjustment_frequency_months && Number(values.adjustment_frequency_months) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La frecuencia de ajuste debe ser un entero mayor a 0.',
          path: ['adjustment_frequency_months'],
        })
      }
      if (values.adjustment_frequency_months && !values.adjustment_index) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seleccioná el índice de referencia.',
          path: ['adjustment_index'],
        })
      }
      if (values.adjustment_index === 'otro' && !values.adjustment_index_notes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Describí el índice de referencia en las notas.',
          path: ['adjustment_index_notes'],
        })
      }
    }

    if (values.currency === 'USD') {
      if (values.adjustment_frequency_months || values.adjustment_index) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Un contrato en USD no tiene frecuencia ni índice de ajuste (RN-03).',
          path: ['adjustment_frequency_months'],
        })
      }
    }
  })

export type CreateContractInput = z.infer<typeof createContractSchema>

// RF-03 + CA-03-08: terminación con motivo obligatorio.
export const terminateContractSchema = z.object({
  reason: z
    .string()
    .min(1, 'El motivo es obligatorio.')
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
})
export type TerminateContractInput = z.infer<typeof terminateContractSchema>

// RF-04 + CA-03-05: aplicación del ajuste — % manual, nunca automático
// (decisión #101). Puede ser negativo (deflación/renegociación);
// tope de sanidad ±500% (§Validaciones).
export const applyAdjustmentSchema = z.object({
  pct: z
    .string()
    .min(1, 'El porcentaje de ajuste es obligatorio.')
    .refine((value) => !Number.isNaN(Number(value)), 'Ingresá un número válido.')
    .refine((value) => Math.abs(Number(value)) <= 500, 'El porcentaje no puede superar ±500%.'),
})
export type ApplyAdjustmentInput = z.infer<typeof applyAdjustmentSchema>

// RF-05: filtro de vencimientos (`?expiring_in_days=`).
export const expiringFilterSchema = z.object({
  expiring_in_days: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => !value || (Number.isInteger(Number(value)) && Number(value) > 0),
      'Ingresá un número entero de días mayor a 0.',
    ),
})
export type ExpiringFilterInput = z.infer<typeof expiringFilterSchema>

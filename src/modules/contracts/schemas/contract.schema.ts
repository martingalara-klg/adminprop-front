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
//
// Issue #50 (espejo de back#100, RN-08/RN-C06, sdd_03 §8 v1.9): alta de
// contrato en curso — `current_amount` + `current_amount_since` sólo
// válidos juntos (CA-03-15). `current_amount_since` se captura como mes
// (`<input type="month">`, el back lo normaliza a día 1) y debe ser
// `>= start_date` y `<= hoy` (CA-03-14).
//
// Issue #57 (espejo de back#107, RN-C06 v2, sdd_03 §8 v1.13): reemplaza
// el mecanismo de #50 cuando el contrato tiene `adjustment_frequency_months`
// (ARS con ajuste periódico) — en ese caso se piden TODOS los tramos
// transcurridos (`historical_amounts[]`, CA-03-09/12/14/15) en vez de un
// único `current_amount`/`current_amount_since`. Sin frecuencia (USD
// siempre, ARS sin ajuste periódico) el mecanismo del #50 sigue vigente.
//
// Issue #69 (feedback #3 del PO): ya no hay checkbox `is_in_progress` —
// el contrato está "en curso" cuando el MES de `start_date` es anterior
// al mes actual (`isContractInProgress`). Con frecuencia: se exigen los
// tramos transcurridos a partir del SEGUNDO (`historical_amounts[1..]`;
// el tramo 0 ES `initial_amount`, no se vuelve a pedir). Sin frecuencia:
// `current_amount`/`current_amount_since` pasan a ser OPCIONALES (el
// backend los acepta opcionales, sdd_03 §8) pero siguen siendo sólo
// válidos juntos (CA-03-15).
import { z } from 'zod'
import {
  computePendingHistoricalAmountTramos,
  isContractInProgress,
} from '../utils/historicalAmountTramos'

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
    // Issue #50 — RN-08/RN-C06: alta de contrato en curso.
    // `current_amount_since` se captura como mes ("YYYY-MM") y se
    // normaliza a día 1 al enviar. Issue #69: sin checkbox — la condición
    // "en curso" se deriva de `start_date` en el superRefine.
    current_amount: z.string().optional().or(z.literal('')),
    current_amount_since: z.string().optional().or(z.literal('')),
    // Issue #57 — RN-C06 v2: un valor por tramo transcurrido, en orden.
    // Sólo aplica cuando currency=ARS y hay adjustment_frequency_months.
    // Issue #69: el índice 0 NO se pide en el form (es `initial_amount`);
    // el page lo completa al armar el payload.
    // Elementos `.optional()`: RHF puede mantener índices sin valor
    // (Controller montado pero sin tocar) como `undefined` explícito, no
    // ausente — con `z.string()` a secas eso dispara el "Required"
    // genérico de zod ANTES de llegar al superRefine de abajo, pisando
    // el mensaje específico por tramo ("Ingresá el monto de...").
    historical_amounts: z.array(z.string().optional()).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.end_date && values.start_date && values.end_date <= values.start_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.',
        path: ['end_date'],
      })
    }

    // Issue #57 (RN-C06 v2): con adjustment_frequency_months (sólo ARS
    // puede tenerla) se piden TODOS los tramos transcurridos, no el
    // valor único de #50. `historical_amounts` viaja en vez de
    // `current_amount`/`current_amount_since` en este caso (sdd_03 §8).
    const parsedFrequency = Number(values.adjustment_frequency_months)
    const usesTramos =
      values.currency === 'ARS' &&
      !!values.adjustment_frequency_months &&
      Number.isInteger(parsedFrequency) &&
      parsedFrequency > 0

    // Issue #69: "en curso" automático por mes de inicio (regla del PO).
    const isInProgress = isContractInProgress(values.start_date)

    if (isInProgress && usesTramos) {
      // Issue #69: el tramo 0 es `initial_amount` — sólo se exigen los
      // siguientes. Si no hay ninguno (contrato recién arrancado, un solo
      // tramo posible) no corresponde pedir/enviar nada — equivale a un
      // alta normal (sdd_03 §8).
      const tramos = computePendingHistoricalAmountTramos(values.start_date, parsedFrequency)
      const amounts = values.historical_amounts ?? []
      tramos.forEach((tramo) => {
        const value = amounts[tramo.index]
        if (!value) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Ingresá el monto de "${tramo.label}".`,
            path: ['historical_amounts', tramo.index],
          })
        } else if (Number(value) <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `El monto de "${tramo.label}" debe ser mayor a 0.`,
            path: ['historical_amounts', tramo.index],
          })
        }
      })
    }

    // CA-03-15: sólo válidos juntos. CA-03-14: la fecha (mes, normalizada
    // a día 1) debe ser >= start_date y <= hoy. Sólo aplica cuando NO hay
    // frecuencia (issue #57 — con frecuencia se usan tramos, no este
    // mecanismo). Issue #69: ambos son OPCIONALES — si el operador no
    // declara nada, el contrato nace con `initial_amount` vigente.
    const declaresCurrentAmount = !!values.current_amount || !!values.current_amount_since
    if (isInProgress && !usesTramos && declaresCurrentAmount) {
      if (!values.current_amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresá el monto vigente hoy.',
          path: ['current_amount'],
        })
      } else if (Number(values.current_amount) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El monto vigente debe ser mayor a 0.',
          path: ['current_amount'],
        })
      }

      if (!values.current_amount_since) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresá desde cuándo rige el monto vigente.',
          path: ['current_amount_since'],
        })
      } else {
        const normalized = `${values.current_amount_since}-01`
        const startMonth = values.start_date ? values.start_date.slice(0, 7) : ''
        const todayIso = new Date().toISOString().slice(0, 10)

        if (startMonth && values.current_amount_since < startMonth) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Debe ser posterior o igual a la fecha de inicio del contrato.',
            path: ['current_amount_since'],
          })
        }
        if (normalized > todayIso) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'No puede ser posterior a hoy.',
            path: ['current_amount_since'],
          })
        }
      }
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

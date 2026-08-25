// src/modules/payments/schemas/payment.schema.ts
//
// Zod schemas — subset de las invariantes del backend
// (spec_module_04_cobranzas.md §"Validaciones"). El backend valida el
// total (RN-P02..P08); estos schemas sólo dan feedback inmediato.
//
// §Validaciones:
//   payment_date: no futura.
//   amount > 0; exchange_rate > 0 cuando aplica (moneda del pago !=
//   moneda del contrato, RN-P06 — el 400 EXCHANGE_RATE_REQUIRED del
//   backend es la fuente autoritativa, este schema es sólo feedback).
//   charged_interest >= 0.
import { z } from 'zod'

export const PAYMENT_METHOD_OPTIONS = ['cash', 'transfer'] as const
export const PAYMENT_CURRENCY_OPTIONS = ['ARS', 'USD'] as const
export const PAYMENT_DESTINATION_OPTIONS = ['agency_account', 'landlord_account'] as const

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHOD_OPTIONS)[number], string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
}

export const PAYMENT_DESTINATION_LABELS: Record<
  (typeof PAYMENT_DESTINATION_OPTIONS)[number],
  string
> = {
  agency_account: 'Cuenta de la administración',
  landlord_account: 'Directo al propietario (ya rendido)',
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * CA-04-03/04/05/06: fecha, medio, moneda, importe, TC condicional
 * (RN-P06), destino (RN-P07), interés cobrado (RN-P04) y notas.
 * `contractCurrency` se inyecta para dar feedback inmediato de TC
 * obligatorio — la validación autoritativa (`400
 * EXCHANGE_RATE_REQUIRED`) siempre la hace el backend.
 */
export function buildRegisterPaymentSchema(contractCurrency: string) {
  return z
    .object({
      payment_date: z
        .string()
        .min(1, 'La fecha de pago es obligatoria.')
        .refine((value) => value <= todayIso(), 'La fecha de pago no puede ser futura.'),
      method: z.enum(PAYMENT_METHOD_OPTIONS),
      payment_currency: z.enum(PAYMENT_CURRENCY_OPTIONS),
      amount: z
        .string()
        .min(1, 'El importe es obligatorio.')
        .refine((value) => Number(value) > 0, 'El importe debe ser mayor a 0.'),
      exchange_rate: z.string().optional().or(z.literal('')),
      destination: z.enum(PAYMENT_DESTINATION_OPTIONS),
      charged_interest: z
        .string()
        .min(1, 'El interés cobrado es obligatorio (podés imputar 0 para perdón total).')
        .refine((value) => Number(value) >= 0, 'El interés cobrado no puede ser negativo.'),
      notes: z.string().optional().or(z.literal('')),
    })
    .superRefine((values, ctx) => {
      if (values.payment_currency !== contractCurrency) {
        if (!values.exchange_rate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Se requiere el tipo de cambio porque la moneda del pago difiere de la del contrato.',
            path: ['exchange_rate'],
          })
        } else if (Number(values.exchange_rate) <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El tipo de cambio debe ser mayor a 0.',
            path: ['exchange_rate'],
          })
        }
      }
    })
}

export type RegisterPaymentInput = z.infer<ReturnType<typeof buildRegisterPaymentSchema>>

// RF-05 + CA-04-07: anulación con motivo obligatorio.
export const voidPaymentSchema = z.object({
  reason: z
    .string()
    .min(1, 'El motivo es obligatorio.')
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
})
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>

// RF-06: filtros de la vista global de deuda.
export const debtFiltersSchema = z.object({
  landlord_id: z.string().optional().or(z.literal('')),
  renter_id: z.string().optional().or(z.literal('')),
  min_days: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0),
      'Ingresá un número entero de días mayor o igual a 0.',
    ),
})
export type DebtFiltersInput = z.infer<typeof debtFiltersSchema>

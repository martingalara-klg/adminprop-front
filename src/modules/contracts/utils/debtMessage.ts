// src/modules/contracts/utils/debtMessage.ts
//
// Issue #70 punto 1 (feedback #3 del PO): el `422 CONTRACT_HAS_DEBT` de
// `POST /contracts/:id/debt-certificate` (decisión #123) trae `details`
// estructurado con lo adeudado del contrato:
//   { contract_id, property_id, periods_overdue, balance, days_late,
//     suggested_interest }
// Antes la UI mostraba ese JSON crudo; acá se construye un mensaje
// legible es-AR ("1 período adeudado · saldo $1.450.000 · ..."), con
// formateo de `src/shared/utils/format.ts` (sin centavos si ,00). Si el
// backend no manda un campo se omite esa parte; si `details` viene vacío
// se cae al mensaje genérico del catálogo (`error-codes.es-AR.ts`).
import { formatMoney } from '@/shared/utils/format'

const GENERIC_DEBT_MESSAGE = 'El contrato tiene deuda pendiente.'

/** Entero no negativo o null — `periods_overdue`/`days_late` llegan como int. */
function toCount(value: unknown): number | null {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (typeof numeric !== 'number' || !Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

/** Monto formateado es-AR o null — `balance`/`suggested_interest` llegan como string decimal. */
function toMoneyLabel(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const formatted = formatMoney(value)
  return formatted === '—' ? null : formatted
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * "El contrato tiene deuda pendiente: 1 período adeudado · saldo
 * $1.450.000 · 19 días de mora · interés sugerido $137.750".
 * Cada parte se omite si el backend no la manda; sin ninguna parte
 * utilizable, mensaje genérico legible (nunca JSON).
 */
export function buildContractDebtMessage(details: Record<string, unknown> | null): string {
  const parts: string[] = []

  const periodsOverdue = toCount(details?.periods_overdue)
  if (periodsOverdue !== null) {
    parts.push(pluralize(periodsOverdue, 'período adeudado', 'períodos adeudados'))
  }

  const balance = toMoneyLabel(details?.balance)
  if (balance !== null) {
    parts.push(`saldo $${balance}`)
  }

  const daysLate = toCount(details?.days_late)
  if (daysLate !== null) {
    parts.push(pluralize(daysLate, 'día de mora', 'días de mora'))
  }

  const suggestedInterest = toMoneyLabel(details?.suggested_interest)
  if (suggestedInterest !== null) {
    parts.push(`interés sugerido $${suggestedInterest}`)
  }

  if (parts.length === 0) return GENERIC_DEBT_MESSAGE
  return `El contrato tiene deuda pendiente: ${parts.join(' · ')}`
}

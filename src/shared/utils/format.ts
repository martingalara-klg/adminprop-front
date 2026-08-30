// src/shared/utils/format.ts
//
// Formateo es-AR de valores numéricos que llegan del backend como
// STRINGS decimales (money/porcentajes, NUMERIC en Postgres) — nunca se
// hace aritmética con floats sobre ellos, solo se formatean para mostrar
// (ver frontend CLAUDE.md §4 "Reglas duras del cliente").

/**
 * Formatea un monto (string decimal) con separador de miles `.` y decimal
 * `,`. Issue #56 (pulido de Contratos, aplicado a TODOS los montos
 * mostrados en la app): los centavos se ocultan cuando son `,00` — sólo
 * se muestran si el monto tiene centavos reales (ej: "100.000" pero
 * "100.000,50").
 */
export function formatMoney(value: string | number): string {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '—'
  const hasCents = Math.round(Math.abs(numeric) * 100) % 100 !== 0
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(numeric)
}

/** Formatea un `commission_pct` (string decimal 0-100) como "12,50%". */
export function formatPercent(value: string | number): string {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '—'
  return `${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric)}%`
}

/** Formatea una fecha ISO (date o date-time) como DD/MM/AAAA. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(date)
}

/**
 * Etiqueta es-AR de un período mensual ("YYYY-MM" o "YYYY-MM-DD", día 1
 * del mes como usa el backend en `period`/`due_period`): "Agosto 2026".
 * Issue #71: capitalizado y sin la preposición "de" que agrega
 * `Intl.DateTimeFormat` ("agosto de 2026").
 */
export function formatPeriodLabel(period: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})/.exec(period ?? '')
  if (!match) return '—'
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return '—'
  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1)),
  )
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`
}

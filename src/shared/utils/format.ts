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

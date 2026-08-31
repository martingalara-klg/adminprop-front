// src/shared/utils/period.ts
//
// Helpers de período mensual "YYYY-MM" (query `?period=` de sdd_03 §9/§10/§11).
// Aritmética de calendario pura (sin Date local) para evitar corrimientos
// por zona horaria: el período es un identificador de mes, no un instante.

const PERIOD_RE = /^(\d{4})-(\d{2})$/

export function isValidPeriod(value: string | null | undefined): value is string {
  const match = PERIOD_RE.exec(value ?? '')
  if (!match) return false
  const month = Number(match[2])
  return month >= 1 && month <= 12
}

/** Período del mes en curso ("YYYY-MM"), en hora local del operador. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** Suma `delta` meses (negativo = hacia atrás) a un período "YYYY-MM". */
export function shiftPeriod(period: string, delta: number): string {
  const match = PERIOD_RE.exec(period)
  if (!match) return period
  const total = Number(match[1]) * 12 + (Number(match[2]) - 1) + delta
  const year = Math.floor(total / 12)
  const month = total - year * 12 + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

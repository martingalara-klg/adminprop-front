// src/modules/contracts/utils/historicalAmountTramos.ts
//
// Issue #57 (espejo de back#107, RN-C06 v2, sdd_03 §8): calcula los
// "tramos transcurridos" de un contrato ARS con `adjustment_frequency_months`
// que se da de alta ya en curso, para pedir un `MoneyInput` por tramo y
// armar `historical_amounts[]` en el orden que el backend espera.
//
// Issue #69 (feedback #3 del PO):
//   - La detección de "contrato en curso" es AUTOMÁTICA por fecha (sin
//     checkbox): el mes de `start_date` es anterior al mes actual
//     (`isContractInProgress`). Ej: hoy 29/08, inicio 01/07 → en curso.
//   - El "Monto inicial" del form ES el tramo 0 (`historical_amounts[0]`
//     debe ser igual a `initial_amount`, sdd_03 §8) — el form no lo vuelve
//     a pedir; sólo pide los tramos a partir del segundo (`index >= 1`).
//   - Los labels pasan de "Primer aumento / Segundo aumento" a
//     "Valor locativo (mes – mes)" con el rango de meses que cubre cada
//     tramo, en es-AR abreviado ("jul 2026 – dic 2026").
//
// Misma regla que el backend: tramo `i` = [start_date + i·frecuencia
// meses, start_date + (i+1)·frecuencia meses). El backend deriva las
// fechas exactas de cada tramo — este util es SOLO para mostrar labels
// legibles en el form; la cantidad de tramos (`historical_amounts.length`)
// es lo único que el backend valida contra su propio cálculo
// (`details.expected_count`).
//
// El front nunca calcula lógica de negocio (CLAUDE.md §5) — esto es
// puramente derivación de UI a partir de datos que el usuario ya
// ingresó (start_date, frecuencia), no una regla de negocio nueva.

const MONTH_LABELS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

const MONTH_FULL_LABELS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

export type HistoricalAmountTramo = {
  /** Posición en `historical_amounts[]` (0 = tramo inicial = `initial_amount`). */
  index: number
  /** Ej: "Valor locativo (jul 2026 – dic 2026)" */
  label: string
  /** Sólo el rango, ej: "jul 2026 – dic 2026" (para la nota del tramo inicial). */
  range: string
}

function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const parts = iso.split('-').map(Number)
  return { y: parts[0] ?? 0, m: parts[1] ?? 1, d: parts[2] ?? 1 }
}

function daysInMonth(y: number, m: number): number {
  // new Date(Date.UTC(y, m, 0)) — día 0 del mes `m` (1-indexado) = último día del mes anterior a `m+1`
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Suma `months` a una fecha ISO ("YYYY-MM-DD"), clampeando el día al último del mes destino. */
function addMonthsIso(iso: string, months: number): string {
  const { y, m, d } = parseIsoDate(iso)
  const totalMonths = y * 12 + (m - 1) + months
  const newY = Math.floor(totalMonths / 12)
  const newM = (totalMonths % 12) + 1
  const clampedD = Math.min(d, daysInMonth(newY, newM))
  return `${newY}-${pad2(newM)}-${pad2(clampedD)}`
}

function subOneDayIso(iso: string): string {
  const { y, m, d } = parseIsoDate(iso)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function formatMonthLabel(iso: string): string {
  const { y, m } = parseIsoDate(iso)
  return `${MONTH_LABELS_ES[m - 1]} ${y}`
}

function isValidIsoDate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
}

/** "julio 2026" — para la nota informativa de contrato en curso (es-AR). */
export function formatMonthLong(iso: string): string {
  if (!isValidIsoDate(iso)) return ''
  const { y, m } = parseIsoDate(iso)
  return `${MONTH_FULL_LABELS_ES[m - 1] ?? ''} ${y}`
}

/**
 * Issue #69 — regla del PO: el contrato está "en curso" si el MES de
 * `start_date` es anterior al mes actual (día irrelevante). Un contrato
 * que arranca este mes o en el futuro es un alta normal.
 */
export function isContractInProgress(startDate: string, today: Date = new Date()): boolean {
  if (!isValidIsoDate(startDate)) return false
  const startMonth = startDate.slice(0, 7)
  const todayMonth = today.toISOString().slice(0, 7)
  return startMonth < todayMonth
}

/** Cantidad de tramos transcurridos (incluye el tramo vigente que contiene "hoy"). */
export function computeTramoCount(
  startDate: string,
  frequencyMonths: number,
  todayIso: string,
): number {
  if (!startDate || !frequencyMonths || frequencyMonths <= 0) return 0
  let count = 0
  while (addMonthsIso(startDate, (count + 1) * frequencyMonths) <= todayIso) {
    count++
  }
  return count + 1
}

/**
 * Todos los tramos del contrato hasta hoy (incluido el inicial, `index 0`).
 * Devuelve `[]` si el contrato recién arrancó (un solo tramo posible) — en
 * ese caso NO corresponde enviar `historical_amounts` (equivale a un alta
 * normal, sdd_03 §8).
 */
export function computeHistoricalAmountTramos(
  startDate: string,
  frequencyMonths: number,
  today: Date = new Date(),
): HistoricalAmountTramo[] {
  if (!isValidIsoDate(startDate) || !frequencyMonths || frequencyMonths <= 0) return []

  const todayIso = today.toISOString().slice(0, 10)
  if (startDate > todayIso) return []

  const tramoCount = computeTramoCount(startDate, frequencyMonths, todayIso)
  if (tramoCount <= 1) return []

  const tramos: HistoricalAmountTramo[] = []
  for (let i = 0; i < tramoCount; i++) {
    const tramoStart = addMonthsIso(startDate, i * frequencyMonths)
    const tramoEnd = subOneDayIso(addMonthsIso(startDate, (i + 1) * frequencyMonths))
    const range = `${formatMonthLabel(tramoStart)} – ${formatMonthLabel(tramoEnd)}`
    tramos.push({ index: i, range, label: `Valor locativo (${range})` })
  }
  return tramos
}

/**
 * Issue #69: tramos que el form efectivamente PIDE — todos menos el
 * inicial, que ya es el "Monto inicial" (`historical_amounts[0] ===
 * initial_amount`, sdd_03 §8).
 */
export function computePendingHistoricalAmountTramos(
  startDate: string,
  frequencyMonths: number,
  today: Date = new Date(),
): HistoricalAmountTramo[] {
  return computeHistoricalAmountTramos(startDate, frequencyMonths, today).slice(1)
}

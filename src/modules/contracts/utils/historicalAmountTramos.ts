// src/modules/contracts/utils/historicalAmountTramos.ts
//
// Issue #57 (espejo de back#107, RN-C06 v2, sdd_03 §8): calcula los
// "tramos transcurridos" de un contrato ARS con `adjustment_frequency_months`
// que se da de alta ya en curso, para pedir un `MoneyInput` por tramo y
// armar `historical_amounts[]` en el orden que el backend espera.
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

const ORDINAL_LABELS = [
  'Valor original',
  'Primer aumento',
  'Segundo aumento',
  'Tercer aumento',
  'Cuarto aumento',
  'Quinto aumento',
  'Sexto aumento',
  'Séptimo aumento',
  'Octavo aumento',
  'Noveno aumento',
  'Décimo aumento',
] as const

export type HistoricalAmountTramo = {
  index: number
  /** Ej: "Valor original (may 2026 – ago 2026)" / "Segundo aumento (ene 2027 – hoy)" */
  label: string
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
 * Tramos a pedir en el form. Devuelve `[]` si el contrato recién arrancó
 * (un solo tramo posible) — en ese caso NO corresponde pedir
 * `historical_amounts` (equivale a un alta normal, sdd_03 §8).
 */
export function computeHistoricalAmountTramos(
  startDate: string,
  frequencyMonths: number,
  today: Date = new Date(),
): HistoricalAmountTramo[] {
  if (!startDate || !frequencyMonths || frequencyMonths <= 0) return []

  const todayIso = today.toISOString().slice(0, 10)
  if (startDate > todayIso) return []

  const tramoCount = computeTramoCount(startDate, frequencyMonths, todayIso)
  if (tramoCount <= 1) return []

  const tramos: HistoricalAmountTramo[] = []
  for (let i = 0; i < tramoCount; i++) {
    const tramoStart = addMonthsIso(startDate, i * frequencyMonths)
    const isCurrent = i === tramoCount - 1
    const ordinal = ORDINAL_LABELS[i] ?? `Aumento ${i}`
    const range = isCurrent
      ? `${formatMonthLabel(tramoStart)} – hoy`
      : `${formatMonthLabel(tramoStart)} – ${formatMonthLabel(subOneDayIso(addMonthsIso(startDate, (i + 1) * frequencyMonths)))}`
    tramos.push({ index: i, label: `${ordinal} (${range})` })
  }
  return tramos
}

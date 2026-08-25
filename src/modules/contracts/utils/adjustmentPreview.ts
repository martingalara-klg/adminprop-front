// src/modules/contracts/utils/adjustmentPreview.ts
//
// RF-04 paso 3: no existe endpoint de preview en sdd_03 §8 (sólo
// `POST /adjustments/:id/apply`, que ya aplica el ajuste). Este helper
// calcula el monto resultante SOLO como indicación visual antes de
// confirmar — nunca se envía al backend, que recalcula de forma
// autoritativa (`new_amount = previous × (1 + pct/100)`, RF-04 paso 3).
//
// CLAUDE.md §4: los montos llegan como strings decimales (NUMERIC en
// Postgres) y nunca se hace aritmética con floats sobre ellos. Este
// cálculo usa BigInt con escala fija en vez de `Number`, para no perder
// precisión ni introducir error de punto flotante en la vista previa.
const PREVIEW_SCALE = 6

function toScaledBigInt(value: string, scale: number): bigint {
  const trimmed = value.trim()
  const isNegative = trimmed.startsWith('-')
  const unsigned = isNegative ? trimmed.slice(1) : trimmed
  const [integerPart, fractionalPart = ''] = unsigned.split('.')
  const paddedFraction = (fractionalPart + '0'.repeat(scale)).slice(0, scale)
  const magnitude = BigInt(integerPart || '0') * 10n ** BigInt(scale) + BigInt(paddedFraction || '0')
  return isNegative ? -magnitude : magnitude
}

function formatScaledBigInt(scaled: bigint, scale: number, displayDecimals: number): string {
  const isNegative = scaled < 0n
  const magnitude = isNegative ? -scaled : scaled
  const divisor = 10n ** BigInt(scale)
  const integerPart = magnitude / divisor
  const remainder = magnitude % divisor
  const fractionalDigits = remainder.toString().padStart(scale, '0')

  // Redondeo al décimo de centavo más cercano (round-half-up), sin floats.
  const keep = fractionalDigits.slice(0, displayDecimals)
  const nextDigit = fractionalDigits[displayDecimals] ?? '0'
  let roundedInteger = integerPart
  let roundedFraction = keep

  if (Number(nextDigit) >= 5) {
    const bumped = (BigInt(keep || '0') + 1n).toString().padStart(displayDecimals, '0')
    if (bumped.length > displayDecimals) {
      roundedInteger += 1n
      roundedFraction = bumped.slice(1)
    } else {
      roundedFraction = bumped
    }
  }

  const sign = isNegative ? '-' : ''
  return displayDecimals > 0
    ? `${sign}${roundedInteger.toString()}.${roundedFraction}`
    : `${sign}${roundedInteger.toString()}`
}

/**
 * Calcula `previous × (1 + pct/100)` sin floats, para mostrar como
 * indicación visual en el flujo de aplicación del ajuste (RF-04 paso 3).
 * Devuelve `null` si algún valor no es un decimal válido.
 */
export function previewAdjustedAmount(previousAmount: string, pct: string): string | null {
  if (!previousAmount || !pct) return null
  if (Number.isNaN(Number(previousAmount)) || Number.isNaN(Number(pct))) return null

  const previousScaled = toScaledBigInt(previousAmount, PREVIEW_SCALE)
  const pctScaled = toScaledBigInt(pct, PREVIEW_SCALE)
  const hundredScaled = 100n * 10n ** BigInt(PREVIEW_SCALE)

  const delta = (previousScaled * pctScaled) / hundredScaled
  const newAmountScaled = previousScaled + delta

  return formatScaledBigInt(newAmountScaled, PREVIEW_SCALE, 2)
}

// src/shared/utils/money.ts
//
// Issue #47 — helpers puros de formateo/parseo usados por `MoneyInput`
// (src/shared/components/MoneyInput.tsx). Separados en su propio módulo
// para no mezclar funciones no-componente con el archivo del componente
// (regla `react-refresh/only-export-components`) y para poder testear la
// lógica de conversión de forma aislada del DOM.
//
// Todo acá opera sobre STRINGS — nunca se hace aritmética con floats
// sobre montos (ver frontend CLAUDE.md §4 "Reglas duras del cliente").

/** Agrupa una cadena de dígitos en miles con separador `.` (es-AR). */
function groupThousands(digits: string): string {
  if (digits === '') return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Convierte lo que sea que haya en el input (tipeado o pegado, con o sin
 * formato es-AR, con o sin separador decimal "crudo" estilo API) al
 * string decimal crudo que la API espera. Nunca produce un float — sólo
 * manipula el string.
 *
 * Heurística para desambiguar el `.`:
 *  - Si hay una coma, la coma es el separador decimal y todos los `.`
 *    son de miles (se descartan).
 *  - Si no hay coma pero hay un único `.` seguido de hasta
 *    `decimalPrecision` dígitos (y nada más después), se interpreta como
 *    separador decimal "crudo" (pegado sin formato, ej "1000000.5").
 *  - En cualquier otro caso, los `.` son de miles (tipeo progresivo es-AR,
 *    ej "1.000.000" con más de `decimalPrecision` dígitos tras el último
 *    punto, o varios puntos).
 */
export function toRawDecimal(input: string, decimalPrecision: number): string {
  const trimmed = input.trim()
  if (trimmed === '') return ''

  const hasComma = trimmed.includes(',')
  let integerPart: string
  let decimalPart: string | undefined

  if (hasComma) {
    const commaIndex = trimmed.indexOf(',')
    integerPart = trimmed.slice(0, commaIndex).replace(/\D/g, '')
    decimalPart = trimmed.slice(commaIndex + 1).replace(/\D/g, '')
  } else {
    const dotCount = (trimmed.match(/\./g) ?? []).length
    const lastDotIndex = trimmed.lastIndexOf('.')
    const digitsAfterLastDot =
      lastDotIndex === -1 ? 0 : trimmed.slice(lastDotIndex + 1).replace(/\D/g, '').length
    const looksLikeRawDecimalDot =
      decimalPrecision > 0 && dotCount === 1 && digitsAfterLastDot > 0 && digitsAfterLastDot <= decimalPrecision

    if (looksLikeRawDecimalDot) {
      integerPart = trimmed.slice(0, lastDotIndex).replace(/\D/g, '')
      decimalPart = trimmed.slice(lastDotIndex + 1).replace(/\D/g, '')
    } else {
      integerPart = trimmed.replace(/\D/g, '')
      decimalPart = undefined
    }
  }

  integerPart = integerPart.replace(/^0+(?=\d)/, '')

  if (decimalPrecision === 0) {
    decimalPart = undefined
  } else if (decimalPart !== undefined) {
    decimalPart = decimalPart.slice(0, decimalPrecision)
  }

  if (integerPart === '' && decimalPart === undefined) return ''
  if (integerPart === '' && decimalPart !== undefined) integerPart = '0'

  return decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart
}

/** Formatea el string decimal crudo como es-AR (miles `.`, decimal `,`). */
export function formatMoneyDisplay(raw: string, decimalPrecision: number): string {
  if (raw === '') return ''
  const dotIndex = raw.indexOf('.')
  if (dotIndex === -1) return groupThousands(raw.replace(/\D/g, ''))

  const integerPart = raw.slice(0, dotIndex).replace(/\D/g, '') || '0'
  const decimalPart = raw
    .slice(dotIndex + 1)
    .replace(/\D/g, '')
    .slice(0, decimalPrecision)
  return `${groupThousands(integerPart)},${decimalPart}`
}

/** Quita ceros a la izquierda de un raw ya bien formado (splice de borrado). */
export function stripLeadingZeros(raw: string): string {
  const dotIndex = raw.indexOf('.')
  const integerPart = dotIndex === -1 ? raw : raw.slice(0, dotIndex)
  const decimalPart = dotIndex === -1 ? undefined : raw.slice(dotIndex + 1)
  let cleanedInt = integerPart.replace(/^0+(?=\d)/, '')
  if (cleanedInt === '') cleanedInt = decimalPart !== undefined ? '0' : ''
  if (cleanedInt === '' && decimalPart === undefined) return ''
  return decimalPart !== undefined ? `${cleanedInt}.${decimalPart}` : cleanedInt
}

/**
 * Cuenta cuántos caracteres "crudos" (dígitos + el separador decimal)
 * hay antes de `cursor` en el string formateado — permite mapear una
 * posición de cursor del `display` (con puntos de miles y coma decimal)
 * a la posición equivalente dentro del string crudo (sin separadores de
 * miles, con `.` como separador decimal).
 */
export function rawIndexFromDisplayCursor(display: string, cursor: number): number {
  let rawIndex = 0
  for (let i = 0; i < cursor && i < display.length; i++) {
    const ch = display[i] ?? ''
    if ((ch >= '0' && ch <= '9') || ch === ',') rawIndex++
  }
  return rawIndex
}

/** Inversa de `rawIndexFromDisplayCursor`: posición en `display` para un índice del crudo. */
export function displayCursorFromRawIndex(display: string, rawIndex: number): number {
  if (rawIndex <= 0) return 0
  let count = 0
  for (let i = 0; i < display.length; i++) {
    const ch = display[i] ?? ''
    if ((ch >= '0' && ch <= '9') || ch === ',') {
      count++
      if (count === rawIndex) return i + 1
    }
  }
  return display.length
}

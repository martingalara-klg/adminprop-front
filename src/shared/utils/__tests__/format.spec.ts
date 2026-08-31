// src/shared/utils/__tests__/format.spec.ts
//
// Issue #56 punto 2: formatMoney oculta los centavos cuando son `,00` y
// los muestra cuando el monto tiene centavos reales.
import { describe, expect, it } from 'vitest'
import { formatMoney, formatPeriodLabel } from '../format'

describe('formatMoney — issue #56 punto 2', () => {
  it('CA-56-02-01: oculta los centavos cuando el monto es entero (,00)', () => {
    expect(formatMoney('100000.00')).toBe('100.000')
    expect(formatMoney(100000)).toBe('100.000')
  })

  it('CA-56-02-02: muestra los centavos cuando son reales', () => {
    expect(formatMoney('100000.50')).toBe('100.000,50')
    expect(formatMoney('1234.05')).toBe('1.234,05')
  })

  it('CA-56-02-03: redondea a 2 decimales cuando vienen más', () => {
    expect(formatMoney('1234.005')).toBe('1.234,01')
  })

  it('CA-56-02-04: un valor no numérico devuelve "—"', () => {
    expect(formatMoney('abc')).toBe('—')
  })

  it('CA-56-02-05: cero se muestra sin centavos', () => {
    expect(formatMoney('0.00')).toBe('0')
  })
})

describe('formatPeriodLabel — issue #71 punto 1', () => {
  it('CA-71-01-01: capitaliza el mes y omite "de" ("Agosto 2026")', () => {
    expect(formatPeriodLabel('2026-08')).toBe('Agosto 2026')
    expect(formatPeriodLabel('2026-07-01')).toBe('Julio 2026')
    expect(formatPeriodLabel('2025-12')).toBe('Diciembre 2025')
  })

  it('CA-71-01-02: un período inválido o vacío devuelve "—"', () => {
    expect(formatPeriodLabel('')).toBe('—')
    expect(formatPeriodLabel(undefined)).toBe('—')
    expect(formatPeriodLabel('2026-13')).toBe('—')
  })
})

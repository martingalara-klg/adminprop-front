// src/shared/utils/__tests__/period.spec.ts
//
// Issue #71: aritmética de períodos "YYYY-MM" del selector de mes.
import { describe, expect, it } from 'vitest'
import { currentPeriod, isValidPeriod, shiftPeriod } from '../period'

describe('period helpers — issue #71', () => {
  it('CA-71-02-01: shiftPeriod avanza y retrocede cruzando el año', () => {
    expect(shiftPeriod('2026-08', 1)).toBe('2026-09')
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01')
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
    expect(shiftPeriod('2026-08', -14)).toBe('2025-06')
  })

  it('CA-71-02-02: shiftPeriod devuelve el valor intacto si no es un período válido', () => {
    expect(shiftPeriod('garbage', 1)).toBe('garbage')
  })

  it('CA-71-02-03: currentPeriod usa el mes local de la fecha dada', () => {
    expect(currentPeriod(new Date(2026, 7, 15))).toBe('2026-08')
    expect(currentPeriod(new Date(2026, 0, 1))).toBe('2026-01')
  })

  it('CA-71-02-04: isValidPeriod acepta YYYY-MM con mes 01..12', () => {
    expect(isValidPeriod('2026-07')).toBe(true)
    expect(isValidPeriod('2026-13')).toBe(false)
    expect(isValidPeriod('2026-07-01')).toBe(false)
    expect(isValidPeriod('')).toBe(false)
    expect(isValidPeriod(undefined)).toBe(false)
  })
})

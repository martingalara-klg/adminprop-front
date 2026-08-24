// src/shared/i18n/messages/__tests__/error-codes.spec.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  errorCodeMessages,
  FALLBACK_ERROR_MESSAGE,
  resolveErrorCodeMessage,
} from '../error-codes.es-AR'

// Catálogo CERRADO de sdd_03_api_contracts.md v1.5 §"Códigos de Error
// Globales" — transversales + auth/usuarios + contratos + cobranzas +
// liquidaciones + mantenimiento.
const SDD_03_ERROR_CATALOG = [
  // Transversales
  'VALIDATION_ERROR',
  'INVALID_DATE_RANGE',
  'UNAUTHORIZED',
  'ACCOUNT_LOCKED',
  'FORBIDDEN',
  'ROLE_REQUIRED',
  'SUPERADMIN_REQUIRED',
  'MEMBERSHIP_INACTIVE',
  'NOT_FOUND',
  'CONFLICT',
  'ENTITY_HAS_DEPENDENCIES',
  'BUSINESS_RULE_VIOLATION',
  'INVALID_STATUS_TRANSITION',
  'RATE_LIMIT_EXCEEDED',
  'INTERNAL_ERROR',
  // Auth y usuarios
  'INVITATION_NOT_FOUND',
  'INVITATION_EXPIRED',
  'INVITATION_ALREADY_ACCEPTED',
  'INVITATION_PENDING_EXISTS',
  'USER_ALREADY_MEMBER',
  'LAST_OWNER_REQUIRED',
  'ROLE_NOT_FOUND',
  'SYSTEM_ROLE_IMMUTABLE',
  'RESET_TOKEN_EXPIRED',
  // Contratos
  'CONTRACT_OVERLAP',
  'CONTRACT_NOT_ACTIVE',
  'ADJUSTMENT_PENDING_EXISTS',
  'ADJUSTMENT_ALREADY_APPLIED',
  'ADJUSTMENT_PCT_REQUIRED',
  // Cobranzas
  'RENT_PERIOD_ALREADY_PAID',
  'PAYMENT_EXCEEDS_CONTRACT_BALANCE',
  'EXCHANGE_RATE_REQUIRED',
  'PAYMENT_ALREADY_VOIDED',
  'RENTER_HAS_DEBT',
  // Liquidaciones
  'SETTLEMENT_ALREADY_EXISTS',
  'SETTLEMENT_EXCHANGE_RATE_REQUIRED',
  'CHARGE_ENTRY_ALREADY_EXISTS',
  // Mantenimiento
  'WORK_ORDER_ALREADY_CLOSED',
  'WORK_ORDER_ALREADY_SETTLED',
  'QUOTE_ALREADY_APPROVED',
]

describe('errorCodeMessages (issue #4 — mapa central error.code → mensaje es-AR)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(SDD_03_ERROR_CATALOG)(
    'CA: el catálogo completo de sdd_03 v1.5 tiene mensaje es-AR — %s',
    (code) => {
      expect(errorCodeMessages[code]).toBeTruthy()
      expect(typeof errorCodeMessages[code]).toBe('string')
    },
  )

  it('CA: resolveErrorCodeMessage devuelve el mensaje mapeado para un código conocido', () => {
    expect(resolveErrorCodeMessage('CONTRACT_OVERLAP')).toBe(
      errorCodeMessages.CONTRACT_OVERLAP,
    )
  })

  it('CA: un error.code fuera del catálogo cerrado cae al mensaje genérico y loguea (no rompe la UI)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const message = resolveErrorCodeMessage('CODE_THAT_DOES_NOT_EXIST_IN_SDD_03')

    expect(message).toBe(FALLBACK_ERROR_MESSAGE)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('CA: código ausente/null cae al fallback sin loguear', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(resolveErrorCodeMessage(null)).toBe(FALLBACK_ERROR_MESSAGE)
    expect(resolveErrorCodeMessage(undefined)).toBe(FALLBACK_ERROR_MESSAGE)
    expect(warnSpy).not.toHaveBeenCalled()
  })
})

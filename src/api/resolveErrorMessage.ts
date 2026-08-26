// src/api/resolveErrorMessage.ts
import { AdminPropApiError, mapError } from './errors'
import { resolveErrorCodeMessage } from '@/shared/i18n/messages/error-codes.es-AR'

/**
 * Resuelve el mensaje es-AR a mostrar en UI para cualquier error
 * (ya sea un AdminPropApiError o un error arbitrario).
 */
export function resolveErrorMessage(error: unknown): string {
  const apiError = error instanceof AdminPropApiError ? error : mapError(error)
  return resolveErrorCodeMessage(apiError.code)
}

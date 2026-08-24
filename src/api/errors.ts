// src/api/errors.ts
//
// Tipado del error CUSTOM del backend (sdd_03 §"Formato de respuesta"):
// { "error": { "code", "message", "field", "details" } }
// NUNCA RFC 7807.
import { AxiosError } from 'axios'

export type AdminPropErrorBody = {
  error: {
    code: string
    message: string
    field?: string | null
    details?: Record<string, unknown>
  }
}

export class AdminPropApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly field: string | null = null,
    public readonly details: Record<string, unknown> = {},
    public readonly requestId?: string | null,
  ) {
    super(message)
    this.name = 'AdminPropApiError'
  }
}

/**
 * Convierte cualquier error (Axios u otro) en un AdminPropApiError.
 *
 * El catálogo de `error.code` de sdd_03 v1.5 es un conjunto CERRADO — un
 * código que no pertenece al catálogo indicaría una divergencia del
 * backend respecto del SDD. No se bloquea la UI por eso: se preserva el
 * código recibido (para loguearlo/reportarlo) y el mapa de mensajes
 * (`error-codes.es-AR.ts`) cae al mensaje genérico si no lo reconoce.
 */
export function mapError(error: unknown): AdminPropApiError {
  if (error instanceof AdminPropApiError) return error

  if (error instanceof AxiosError) {
    if (error.response) {
      const body = error.response.data as Partial<AdminPropErrorBody> | undefined
      const err = body?.error
      const requestId = (error.response.headers?.['x-request-id'] as string | undefined) ?? null

      return new AdminPropApiError(
        err?.code ?? 'INTERNAL_ERROR',
        error.response.status,
        err?.message ?? 'Ocurrió un error inesperado.',
        err?.field ?? null,
        err?.details ?? {},
        requestId,
      )
    }

    // Sin response: timeout, red caída, CORS, request cancelado, etc.
    return new AdminPropApiError('NETWORK_ERROR', 0, 'Error de red. Verificá tu conexión.')
  }

  return new AdminPropApiError('INTERNAL_ERROR', 0, 'Ocurrió un error inesperado.')
}

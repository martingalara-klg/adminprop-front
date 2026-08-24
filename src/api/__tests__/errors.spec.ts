// src/api/__tests__/errors.spec.ts
import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { AdminPropApiError, mapError } from '../errors'

function buildAxiosError(status: number, body: unknown, requestId?: string) {
  const headers = new AxiosHeaders()
  if (requestId) headers.set('x-request-id', requestId)

  const error = new AxiosError('Request failed')
  error.response = {
    status,
    data: body,
    statusText: '',
    headers,
    config: { headers: new AxiosHeaders() } as never,
  }
  return error
}

describe('mapError (issue #4 — mapa central de errores)', () => {
  it('CA: parsea el formato CUSTOM { error: { code, message, field, details } } del backend', () => {
    const axiosError = buildAxiosError(
      409,
      { error: { code: 'CONTRACT_OVERLAP', message: 'Solapamiento', field: null, details: { conflicting_contract_id: 'abc' } } },
      'req-123',
    )

    const result = mapError(axiosError)

    expect(result).toBeInstanceOf(AdminPropApiError)
    expect(result.code).toBe('CONTRACT_OVERLAP')
    expect(result.status).toBe(409)
    expect(result.message).toBe('Solapamiento')
    expect(result.details).toEqual({ conflicting_contract_id: 'abc' })
    expect(result.requestId).toBe('req-123')
  })

  it('CA: un error.code fuera del catálogo cerrado de sdd_03 no rompe el parseo (se preserva para reportar)', () => {
    const axiosError = buildAxiosError(422, {
      error: { code: 'SOME_UNKNOWN_CODE_NOT_IN_SDD', message: 'x', field: null, details: {} },
    })

    const result = mapError(axiosError)

    expect(result.code).toBe('SOME_UNKNOWN_CODE_NOT_IN_SDD')
  })

  it('CA: sin body de error reconocible cae a INTERNAL_ERROR', () => {
    const axiosError = buildAxiosError(500, {})

    const result = mapError(axiosError)

    expect(result.code).toBe('INTERNAL_ERROR')
  })

  it('CA: sin response (timeout / red caída) cae a NETWORK_ERROR con status 0', () => {
    const axiosError = new AxiosError('Network Error')

    const result = mapError(axiosError)

    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.status).toBe(0)
  })

  it('CA: un AdminPropApiError ya mapeado se devuelve sin modificar', () => {
    const original = new AdminPropApiError('NOT_FOUND', 404, 'No encontrado')

    expect(mapError(original)).toBe(original)
  })

  it('CA: un error arbitrario (no Axios) cae a INTERNAL_ERROR', () => {
    const result = mapError(new Error('boom'))

    expect(result.code).toBe('INTERNAL_ERROR')
  })
})

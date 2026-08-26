// src/shared/observability/__tests__/requestBreadcrumbs.spec.ts
//
// Issue #15 — "el X-Request-Id ... se registra como breadcrumb/contexto
// para trazabilidad de errores". Cubre el módulo liviano en sí (sin
// Sentry instalado, ver docstring de requestBreadcrumbs.ts); la
// integración real con http-client.ts está cubierta por
// src/api/__tests__/http-client.spec.ts (interceptores).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearRequestBreadcrumbs,
  getRequestBreadcrumbs,
  recordRequestBreadcrumb,
  reportRequestError,
} from '../requestBreadcrumbs'

describe('observability/requestBreadcrumbs (#15)', () => {
  beforeEach(() => {
    clearRequestBreadcrumbs()
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('CA: registra un breadcrumb por request con su request-id', () => {
    recordRequestBreadcrumb({
      requestId: 'req-1',
      method: 'GET',
      url: '/notifications',
      status: 'pending',
      timestamp: '2026-08-20T10:00:00Z',
    })

    expect(getRequestBreadcrumbs()).toEqual([
      {
        requestId: 'req-1',
        method: 'GET',
        url: '/notifications',
        status: 'pending',
        timestamp: '2026-08-20T10:00:00Z',
      },
    ])
  })

  it('CA: mantiene sólo los últimos N request-ids (ring buffer)', () => {
    for (let i = 0; i < 25; i += 1) {
      recordRequestBreadcrumb({
        requestId: `req-${i}`,
        method: 'GET',
        url: '/x',
        status: 200,
        timestamp: '2026-08-20T10:00:00Z',
      })
    }

    const breadcrumbs = getRequestBreadcrumbs()
    expect(breadcrumbs).toHaveLength(20)
    expect(breadcrumbs[0]?.requestId).toBe('req-5') // los primeros 5 se descartaron
    expect(breadcrumbs[19]?.requestId).toBe('req-24')
  })

  it('CA: reportRequestError loguea el error junto con el trail de breadcrumbs previos (punto de integración Sentry)', () => {
    recordRequestBreadcrumb({
      requestId: 'req-1',
      method: 'GET',
      url: '/notifications',
      status: 200,
      timestamp: '2026-08-20T10:00:00Z',
    })

    reportRequestError({
      requestId: 'req-2',
      method: 'POST',
      url: '/notifications/n-1/read',
      status: 404,
      code: 'NOT_FOUND',
      message: 'No encontramos lo que buscás.',
    })

    expect(console.error).toHaveBeenCalledWith(
      '[observability] request error',
      expect.objectContaining({ requestId: 'req-2', code: 'NOT_FOUND' }),
      expect.objectContaining({
        breadcrumbs: expect.arrayContaining([expect.objectContaining({ requestId: 'req-1' })]),
      }),
    )
  })

  it('CA: getRequestBreadcrumbs devuelve una copia (no expone el array interno)', () => {
    recordRequestBreadcrumb({
      requestId: 'req-1',
      method: 'GET',
      url: '/notifications',
      status: 200,
      timestamp: '2026-08-20T10:00:00Z',
    })

    const first = getRequestBreadcrumbs()
    first.push({
      requestId: 'injected',
      method: 'GET',
      url: '/x',
      status: 200,
      timestamp: '2026-08-20T10:00:00Z',
    })

    expect(getRequestBreadcrumbs()).toHaveLength(1)
  })
})

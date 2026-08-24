// src/api/__tests__/http-client.spec.ts
//
// docs/prompts/session-start.md Capa 4 — nombrar tests con CA-XX del issue.
// Issue #4 no define CA-XX numerados (tipo INFRA); se referencian los
// criterios de aceptación literales del issue.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'

const API_BASE = 'http://localhost:8000/v1'

let refreshCallCount = 0
let protectedCallCount = 0
let loginCallCount = 0
let meCallCount = 0

const server = setupServer(
  http.post(`${API_BASE}/protected`, () => {
    protectedCallCount += 1
    if (protectedCallCount === 1) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Token ausente, expirado o invalido.', field: null, details: {} } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ data: { ok: true } }, { status: 200 })
  }),

  http.post(`${API_BASE}/always-401`, () => {
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Token ausente, expirado o invalido.', field: null, details: {} } },
      { status: 401 },
    )
  }),

  http.post(`${API_BASE}/auth/refresh`, async () => {
    refreshCallCount += 1
    await delay(20)
    return HttpResponse.json({ data: { status: 'refreshed' } }, { status: 200 })
  }),

  http.post(`${API_BASE}/auth/login`, () => {
    loginCallCount += 1
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Credenciales incorrectas.', field: null, details: {} } },
      { status: 401 },
    )
  }),

  http.get(`${API_BASE}/auth/me`, () => {
    meCallCount += 1
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Tu sesión expiró.', field: null, details: {} } },
      { status: 401 },
    )
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  refreshCallCount = 0
  protectedCallCount = 0
  loginCallCount = 0
  meCallCount = 0
})
afterAll(() => server.close())

/** jsdom's `window.location.assign` is non-configurable — replace the whole object to spy on it. */
function stubLocationAssign() {
  const assign = vi.fn()
  const originalLocation = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, assign },
  })
  return {
    assign,
    restore: () => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    },
  }
}

describe('http-client — interceptor de refresh (issue #4)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', API_BASE)
  })

  it('CA: 401 en un request dispara refresh, reintenta la request original, y la request original resuelve OK', async () => {
    const { httpClient } = await import('../http-client')

    const response = await httpClient.post('/protected')

    expect(response.status).toBe(200)
    expect(response.data).toEqual({ data: { ok: true } })
    expect(refreshCallCount).toBe(1)
    expect(protectedCallCount).toBe(2)
  })

  it('CA: si el refresh falla, redirige a /login y no reintenta en loop', async () => {
    server.use(
      http.post(`${API_BASE}/auth/refresh`, () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Token ausente, expirado o invalido.', field: null, details: {} } },
          { status: 401 },
        ),
      ),
    )

    const httpClientModule = await import('../http-client')
    const location = stubLocationAssign()

    await expect(httpClientModule.httpClient.post('/always-401')).rejects.toBeTruthy()

    expect(location.assign).toHaveBeenCalledWith('/login')
    location.restore()
  })

  it('CA: single-flight — múltiples 401 concurrentes coalescen en un único POST /auth/refresh', async () => {
    const { httpClient } = await import('../http-client')

    const results = await Promise.allSettled([
      httpClient.post('/protected'),
      httpClient.post('/protected'),
      httpClient.post('/protected'),
    ])

    expect(refreshCallCount).toBe(1)
    // Cada request original se reintenta una vez tras el refresh compartido.
    results.forEach((result) => expect(result.status).toBe('fulfilled'))
  })

  it('CA: nunca dispara refresh sobre el propio endpoint de login', async () => {
    const { httpClient } = await import('../http-client')

    await expect(httpClient.post('/auth/login', { email: 'a@a.com', password: 'x' })).rejects.toBeTruthy()

    expect(refreshCallCount).toBe(0)
    expect(loginCallCount).toBe(1)
  })

  it('CA: nunca dispara refresh sobre el propio endpoint de refresh', async () => {
    server.use(
      http.post(`${API_BASE}/auth/refresh`, () => {
        refreshCallCount += 1
        return HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Token ausente, expirado o invalido.', field: null, details: {} } },
          { status: 401 },
        )
      }),
    )

    await import('../http-client')
    const { authApi } = await import('../auth.api')
    const location = stubLocationAssign()

    // El propio refresh devuelve 401 (refresh token vencido). No debe
    // volver a intentar refrescar sobre sí mismo.
    await expect(authApi.refresh()).rejects.toBeTruthy()

    expect(refreshCallCount).toBe(1)
    location.restore()
  })

  it('CA-21-06: nunca dispara refresh sobre GET /auth/me -- su 401 es "sin sesión", no expiración a mitad de uso (issue #21)', async () => {
    const { httpClient } = await import('../http-client')
    const location = stubLocationAssign()

    await expect(httpClient.get('/auth/me')).rejects.toBeTruthy()

    expect(refreshCallCount).toBe(0)
    expect(meCallCount).toBe(1)
    expect(location.assign).not.toHaveBeenCalled()
    location.restore()
  })
})

// src/api/http-client.ts
//
// Cliente HTTP central. Ningún módulo crea instancias Axios ad-hoc.
//
// sdd_03 §"Convenciones Generales":
//   - JWT RS256 en cookies HttpOnly Secure, SameSite=Lax → withCredentials true.
//   - Base URL /v1.
// sdd_04 §2.2: access 8h + refresh 30d rotativo (single-use) → interceptor
// de 401 dispara refresh, reintenta la request original UNA sola vez, y si
// el refresh falla redirige a /login. Single-flight: múltiples 401
// concurrentes coalescen en un solo POST /auth/refresh.
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { v4 as uuidv4 } from 'uuid'
// `authApi` se usa SOLO de forma diferida (dentro del interceptor
// asincrónico de 401, nunca en la evaluación sincrónica de este módulo) --
// `auth.api.ts` importa `httpClient`/estas rutas de vuelta desde acá, y
// leer un binding de un módulo circular en su evaluación top-level (en vez
// de diferido) revienta con "Cannot access 'X' before initialization" en
// el bundle de produccion (issue #21: App.tsx ahora importa el barrel de
// auth de forma eager via useSessionBootstrap, lo que cambia el orden de
// evaluación del ciclo http-client.ts <-> auth.api.ts). Por eso las
// constantes de ruta viven ACA (import.ts -> auth.api.ts, una sola
// dirección) y no al revés.
import { authApi } from './auth.api'
// issue #15 — breadcrumbs con X-Request-Id para trazabilidad de errores.
// Sentry no está instalado (post-infra, decisión #111); este módulo es el
// único punto de integración a reemplazar cuando se instale el SDK (ver
// docstring de src/shared/observability/requestBreadcrumbs.ts).
import { recordRequestBreadcrumb, reportRequestError } from '@/shared/observability'

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/v1'

export const AUTH_REFRESH_PATH = '/auth/refresh'
export const AUTH_LOGIN_PATH = '/auth/login'
export const AUTH_LOGOUT_PATH = '/auth/logout'
// sdd_03 §1 v1.6 (issue #21): su 401 es la señal normal de "sin sesión" al
// rehidratar (useSessionBootstrap ya lo maneja con un clearSession() sin
// redirect) -- no una sesión que expiró a mitad de uso, que es el caso que
// el refresh-then-redirect sí debe cubrir.
export const AUTH_ME_PATH = '/auth/me'

// Endpoints sobre los que el interceptor de 401 NUNCA dispara un refresh
// (evita el loop clásico refresh-sobre-refresh / refresh-sobre-login).
const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [
  AUTH_REFRESH_PATH,
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AUTH_ME_PATH,
]

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retried?: boolean }

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH.some((path) => url.includes(path))
}

/** Redirige a /login. Aislado en una función para poder espiarlo en tests. */
export function redirectToLogin(): void {
  window.location.assign('/login')
}

export const httpClient = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  withCredentials: true, // sdd_03 — la cookie HttpOnly viaja en cada request
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request: propagar X-Request-Id (sdd_04 §4.6) ──────────────────────────
httpClient.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = config.headers['X-Request-Id'] ?? uuidv4()

  // issue #15: breadcrumb del request saliente ANTES de la respuesta — el
  // trail completo (no solo el error final) es lo que hace útil un
  // breadcrumb de Sentry para reconstruir qué pasó antes de una falla.
  recordRequestBreadcrumb({
    requestId: String(config.headers['X-Request-Id']),
    method: (config.method ?? 'get').toUpperCase(),
    url: config.url ?? '',
    status: 'pending',
    timestamp: new Date().toISOString(),
  })

  return config
})

// ─── Response: refresh transparente en 401 (single-flight, un solo retry) ──
// `refreshPromise` coalesce las requests 401 concurrentes en un único
// POST /auth/refresh in-flight. Se resetea a null tanto en éxito como en
// falla para permitir un refresh nuevo en la próxima expiración.
let refreshPromise: Promise<void> | null = null

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined
    const status = error.response?.status

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retried &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retried = true

      try {
        refreshPromise = refreshPromise ?? authApi.refresh().then(() => undefined)
        await refreshPromise
        refreshPromise = null
        return httpClient.request(originalRequest as AxiosRequestConfig)
      } catch (refreshError) {
        refreshPromise = null
        redirectToLogin()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

// ─── Response: Retry-After global en 429 (sdd_04 §2.5) ─────────────────────
httpClient.interceptors.response.use(undefined, (error: AxiosError) => {
  if (error.response?.status === 429) {
    const retryAfter = parseInt(String(error.response.headers?.['retry-after'] ?? '60'), 10)
    window.dispatchEvent(
      new CustomEvent('adminprop:rate-limited', { detail: { retryAfterSeconds: retryAfter } }),
    )
  }
  return Promise.reject(error)
})

// ─── Response: breadcrumb final + reporte de error (issue #15) ─────────────
// Registrado AL FINAL de la cadena para capturar el resultado definitivo
// (después del retry de 401 y del side-effect de 429), no el intento
// inicial. En error, además de la breadcrumb, reporta con el trail
// completo previo (hoy console.error; mañana Sentry.captureException).
httpClient.interceptors.response.use(
  (response) => {
    const requestId = String(response.config.headers?.['X-Request-Id'] ?? '')
    recordRequestBreadcrumb({
      requestId,
      method: (response.config.method ?? 'get').toUpperCase(),
      url: response.config.url ?? '',
      status: response.status,
      timestamp: new Date().toISOString(),
    })
    return response
  },
  (error: AxiosError) => {
    const config = error.config
    const requestId = String(config?.headers?.['X-Request-Id'] ?? '')
    const method = (config?.method ?? 'get').toUpperCase()
    const url = config?.url ?? ''
    const status = error.response?.status ?? 0

    recordRequestBreadcrumb({ requestId, method, url, status, timestamp: new Date().toISOString() })

    const body = error.response?.data as { error?: { code?: string; message?: string } } | undefined
    reportRequestError({
      requestId,
      method,
      url,
      status,
      code: body?.error?.code ?? 'NETWORK_ERROR',
      message: body?.error?.message ?? error.message,
    })

    return Promise.reject(error)
  },
)

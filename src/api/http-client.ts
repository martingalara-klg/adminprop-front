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
import { AUTH_LOGIN_PATH, AUTH_LOGOUT_PATH, AUTH_REFRESH_PATH, authApi } from './auth.api'

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/v1'

// Endpoints sobre los que el interceptor de 401 NUNCA dispara un refresh
// (evita el loop clásico refresh-sobre-refresh / refresh-sobre-login).
const AUTH_ENDPOINTS_EXCLUDED_FROM_REFRESH = [AUTH_REFRESH_PATH, AUTH_LOGIN_PATH, AUTH_LOGOUT_PATH]

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

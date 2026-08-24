// src/api/auth.api.ts
//
// Cliente mínimo de auth requerido por el interceptor de refresh
// (src/api/http-client.ts). El resto del módulo de auth (login UI,
// forgot/reset password, invitaciones) se implementa en #5.
//
// sdd_03 §1 "Autenticación (/auth/*)":
//   POST /auth/login    → 200 { data: { status, user, organizations[] } }
//   POST /auth/logout   → 204
//   POST /auth/refresh  → 200 (rota refresh token; cookie nueva)
import { httpClient } from './http-client'
import type { components } from './generated/types'

type LoginResponse = components['schemas']['LoginResponse']
type RefreshResponse = components['schemas']['RefreshResponse']

export const AUTH_REFRESH_PATH = '/auth/refresh'
export const AUTH_LOGIN_PATH = '/auth/login'
export const AUTH_LOGOUT_PATH = '/auth/logout'

export const authApi = {
  /**
   * Rota el refresh token (single-use) y renueva la cookie de access
   * token. El backend deriva todo de la cookie HttpOnly — no hay body.
   */
  async refresh(): Promise<RefreshResponse> {
    const response = await httpClient.post<RefreshResponse>(AUTH_REFRESH_PATH)
    return response.data
  },

  async login(payload: {
    email: string
    password: string
    organization_id?: string
  }): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(AUTH_LOGIN_PATH, payload)
    return response.data
  },

  async logout(): Promise<void> {
    await httpClient.post(AUTH_LOGOUT_PATH)
  },
}

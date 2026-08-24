// src/api/auth.api.ts
//
// Cliente de auth completo — sdd_03 §1 "Autenticación (/auth/*)":
//   POST /auth/login              → 200 { data: { status, user, organizations[] } }
//   POST /auth/logout             → 204
//   POST /auth/refresh            → 200 (rota refresh token; cookie nueva)
//   GET  /auth/invitation/:token  → 200 { data: { email, organization_name, role_name } }
//   POST /auth/accept-invitation  → 201 (nombre + password; setea cookies)
//   POST /auth/forgot-password    → 200 SIEMPRE (anti-enumeration)
//   GET  /auth/reset-password/:token → 200 | 404 | 410
//   POST /auth/reset-password     → 200
import { httpClient } from './http-client'
import type { components } from './generated/types'

type LoginResponse = components['schemas']['LoginResponse']
type RefreshResponse = components['schemas']['RefreshResponse']
type InvitationDetailResponse = components['schemas']['InvitationDetailResponse']
type AcceptInvitationRequest = components['schemas']['AcceptInvitationRequest']
type AcceptInvitationResponse = components['schemas']['AcceptInvitationResponse']
type ForgotPasswordResponse = components['schemas']['ForgotPasswordResponse']
type ResetPasswordTokenResponse = components['schemas']['ResetPasswordTokenResponse']
type ResetPasswordRequest = components['schemas']['ResetPasswordRequest']
type ResetPasswordResponse = components['schemas']['ResetPasswordResponse']

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

  /** sdd_03 §1: valida el token de invitación antes de mostrar el form de activación. */
  async getInvitation(
    token: string,
    opts?: { signal?: AbortSignal },
  ): Promise<InvitationDetailResponse> {
    const response = await httpClient.get<InvitationDetailResponse>(
      `/auth/invitation/${encodeURIComponent(token)}`,
      { signal: opts?.signal },
    )
    return response.data
  },

  /** sdd_03 §1 + spec_module_00 §"Flujo de Activación": crea user + membresía owner, setea cookies. */
  async acceptInvitation(payload: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
    const response = await httpClient.post<AcceptInvitationResponse>(
      '/auth/accept-invitation',
      payload,
    )
    return response.data
  },

  /** sdd_03 §1: SIEMPRE 200 (anti-enumeration) — el mensaje literal vive en security.es-AR.ts. */
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const response = await httpClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
      email,
    })
    return response.data
  },

  /** sdd_03 §1: 200 | 404 | 410 (RESET_TOKEN_EXPIRED, agregado issue #8). */
  async getResetPasswordToken(
    token: string,
    opts?: { signal?: AbortSignal },
  ): Promise<ResetPasswordTokenResponse> {
    const response = await httpClient.get<ResetPasswordTokenResponse>(
      `/auth/reset-password/${encodeURIComponent(token)}`,
      { signal: opts?.signal },
    )
    return response.data
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const response = await httpClient.post<ResetPasswordResponse>('/auth/reset-password', payload)
    return response.data
  },
}

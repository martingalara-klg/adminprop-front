// src/api/auth.api.ts
//
// Cliente de auth completo — sdd_03 §1 "Autenticación (/auth/*)" (v1.6):
//   POST /auth/login              → 200 { data: { status, user, organizations[], permissions[], is_super_admin } }
//   POST /auth/logout             → 204
//   POST /auth/refresh            → 200 (rota refresh token; cookie nueva)
//   GET  /auth/invitation/:token  → 200 { data: { email, organization_name, role_name } }
//   POST /auth/accept-invitation  → 201 (nombre + password; setea cookies) { data: { ..., permissions[], is_super_admin } }
//   POST /auth/forgot-password    → 200 SIEMPRE (anti-enumeration)
//   GET  /auth/reset-password/:token → 200 | 404 | 410
//   POST /auth/reset-password     → 200
//   GET  /auth/me                 → 200 { data: { user, organization, role, permissions[], is_super_admin } } | 401 | 403 MEMBERSHIP_INACTIVE
// issue #23: las rutas vienen de `auth.paths.ts` (módulo neutral, sin
// dependencias de `http-client.ts` ni de este archivo) -- antes se
// importaban desde `./http-client`, lo que era la otra arista del ciclo
// `http-client.ts ⇄ auth.api.ts` (issue #21).
import { AUTH_LOGIN_PATH, AUTH_LOGOUT_PATH, AUTH_ME_PATH, AUTH_REFRESH_PATH } from './auth.paths'
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
type MeResponse = components['schemas']['MeResponse']

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

  /**
   * sdd_03 §1 v1.6 (issue #84): rehidrata la sesión al recargar la app.
   * `permissions[]`/`role` se leen en vivo de la membresía vigente (no del
   * JWT cacheado) — 401 sin cookie válida, 403 `MEMBERSHIP_INACTIVE` si la
   * membresía fue desactivada después de emitido el JWT.
   */
  async me(opts?: { signal?: AbortSignal }): Promise<MeResponse> {
    const response = await httpClient.get<MeResponse>(AUTH_ME_PATH, { signal: opts?.signal })
    return response.data
  },
}

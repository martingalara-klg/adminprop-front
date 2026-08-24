// src/modules/auth/__tests__/reset-password.spec.tsx
//
// SDD: sdd_03 §1 "GET /auth/reset-password/:token -> 200 | 404 | 410".
// Issue #5 CA: cubrir el token vencido (410 RESET_TOKEN_EXPIRED).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAuthApp } from './test-router'
import { AdminPropApiError } from '@/api/errors'

vi.mock('@/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getResetPasswordToken: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

import { authApi } from '@/api/auth.api'

describe('UC-RESET-PASSWORD — Reset password (sdd_03 §1)', () => {
  afterEach(() => vi.clearAllMocks())

  it('CA-05-10: token expirado (410 RESET_TOKEN_EXPIRED) muestra una pantalla dedicada, no un error genérico', async () => {
    vi.mocked(authApi.getResetPasswordToken).mockRejectedValueOnce(
      new AdminPropApiError('RESET_TOKEN_EXPIRED', 410, 'El enlace expiró.'),
    )

    renderAuthApp('/reset-password?token=expired-token')

    await waitFor(() => {
      expect(screen.getByText('El enlace expiró')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /solicitar uno nuevo/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('CA-05-11: token inexistente/ya usado (404 NOT_FOUND) muestra "enlace inválido"', async () => {
    vi.mocked(authApi.getResetPasswordToken).mockRejectedValueOnce(
      new AdminPropApiError('NOT_FOUND', 404, 'No encontrado.'),
    )

    renderAuthApp('/reset-password?token=used-token')

    await waitFor(() => {
      expect(screen.getByText('Enlace inválido')).toBeInTheDocument()
    })
  })

  it('CA-05-12: token válido permite establecer una nueva contraseña', async () => {
    vi.mocked(authApi.getResetPasswordToken).mockResolvedValueOnce({
      data: { email: 'owner@a.com' },
    })
    vi.mocked(authApi.resetPassword).mockResolvedValueOnce({
      data: { message: 'Tu contraseña fue actualizada correctamente.' },
    })

    renderAuthApp('/reset-password?token=valid-token')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText(/nueva contraseña/i))
    await user.type(screen.getByLabelText(/nueva contraseña/i), 'Password1234')
    await user.type(screen.getByLabelText(/repetir contraseña/i), 'Password1234')
    await user.click(screen.getByRole('button', { name: /restablecer contraseña/i }))

    await waitFor(() => {
      expect(screen.getByText('Contraseña actualizada')).toBeInTheDocument()
    })
    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: 'valid-token',
      password: 'Password1234',
    })
  })
})

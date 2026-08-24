// src/modules/auth/__tests__/forgot-password.spec.tsx
//
// SDD: sdd_03 §1 "POST /auth/forgot-password -> 200 SIEMPRE" +
// sdd_04 §2.2a (texto literal, anti-enumeration).
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
    forgotPassword: vi.fn(),
  },
}))

import { authApi } from '@/api/auth.api'

const LITERAL_CONFIRMATION =
  'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña en los próximos minutos.'

describe('UC-FORGOT-PASSWORD — Forgot password (sdd_03 §1)', () => {
  afterEach(() => vi.clearAllMocks())

  it('CA-05-07: email registrado muestra el texto literal de confirmación', async () => {
    vi.mocked(authApi.forgotPassword).mockResolvedValueOnce({
      data: { message: LITERAL_CONFIRMATION },
    })

    renderAuthApp('/forgot-password')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'existe@example.com')
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }))

    await waitFor(() => {
      expect(screen.getByText(LITERAL_CONFIRMATION)).toBeInTheDocument()
    })
  })

  it('CA-05-08: email inexistente muestra EXACTAMENTE el mismo texto literal (anti-enumeration)', async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValueOnce(
      new AdminPropApiError('NOT_FOUND', 404, 'No encontramos lo que buscás.'),
    )

    renderAuthApp('/forgot-password')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'no-existe@example.com')
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }))

    await waitFor(() => {
      expect(screen.getByText(LITERAL_CONFIRMATION)).toBeInTheDocument()
    })
  })

  it('CA-05-09: RATE_LIMIT_EXCEEDED se muestra como tal (no revela nada del email)', async () => {
    vi.mocked(authApi.forgotPassword).mockRejectedValueOnce(
      new AdminPropApiError('RATE_LIMIT_EXCEEDED', 429, 'Demasiadas solicitudes.'),
    )

    renderAuthApp('/forgot-password')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'cualquiera@example.com')
    await user.click(screen.getByRole('button', { name: /enviar instrucciones/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Demasiadas solicitudes. Esperá unos segundos e intentá nuevamente.'),
      ).toBeInTheDocument()
    })
    expect(screen.queryByText(LITERAL_CONFIRMATION)).not.toBeInTheDocument()
  })
})

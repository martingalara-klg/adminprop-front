// src/modules/auth/__tests__/accept-invitation.spec.tsx
//
// SDD: sdd_03 §1 + spec_module_00_superadmin.md §"Flujo de Activacion de
// Cuenta". Issue #5 CA: "El flujo de aceptacion de invitacion cubre el
// estado expired."
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAuthApp } from './test-router'
import { useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'

vi.mock('@/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
  },
}))

import { authApi } from '@/api/auth.api'

describe('UC-01 — Activación de cuenta vía invitación', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null })
    localStorage.clear()
  })

  afterEach(() => vi.clearAllMocks())

  it('CA-05-13: token expirado (INVITATION_EXPIRED) muestra pantalla dedicada con el motivo (72hs)', async () => {
    vi.mocked(authApi.getInvitation).mockRejectedValueOnce(
      new AdminPropApiError('INVITATION_EXPIRED', 410, 'La invitación expiró.'),
    )

    renderAuthApp('/accept-invitation?token=expired-token')

    await waitFor(() => {
      expect(screen.getByText('Esta invitación expiró')).toBeInTheDocument()
    })
    expect(screen.getByText(/72 horas/i)).toBeInTheDocument()
  })

  it('CA-05-14: invitación ya aceptada (INVITATION_ALREADY_ACCEPTED) ofrece ir a login', async () => {
    vi.mocked(authApi.getInvitation).mockRejectedValueOnce(
      new AdminPropApiError('INVITATION_ALREADY_ACCEPTED', 409, 'Ya fue usada.'),
    )

    renderAuthApp('/accept-invitation?token=used-token')

    await waitFor(() => {
      expect(screen.getByText('Esta invitación ya fue usada')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /ir a ingresar/i })).toHaveAttribute('href', '/login')
  })

  it('CA-05-15: token inexistente (INVITATION_NOT_FOUND) muestra "invitación no encontrada"', async () => {
    vi.mocked(authApi.getInvitation).mockRejectedValueOnce(
      new AdminPropApiError('INVITATION_NOT_FOUND', 404, 'No encontrada.'),
    )

    renderAuthApp('/accept-invitation?token=bad-token')

    await waitFor(() => {
      expect(screen.getByText('Invitación no encontrada')).toBeInTheDocument()
    })
  })

  it('CA-05-16: activación exitosa deja al owner logueado (CA-00-03)', async () => {
    vi.mocked(authApi.getInvitation).mockResolvedValueOnce({
      data: {
        email: 'nuevo-owner@a.com',
        organization_name: 'Inmobiliaria Nueva',
        role_name: 'owner',
      },
    })
    vi.mocked(authApi.acceptInvitation).mockResolvedValueOnce({
      data: {
        status: 'authenticated',
        user: { id: 'user-9', email: 'nuevo-owner@a.com', full_name: 'Nuevo Owner' },
        organization: { id: 'org-9', name: 'Inmobiliaria Nueva', role: 'owner' },
        permissions: ['user:manage', 'organization:configure'],
        is_super_admin: false,
      },
    })

    renderAuthApp('/accept-invitation?token=valid-token')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText(/nombre completo/i))
    await user.type(screen.getByLabelText(/nombre completo/i), 'Nuevo Owner')
    await user.type(screen.getByLabelText('Contraseña'), 'Password1234')
    await user.type(screen.getByLabelText(/repetir contraseña/i), 'Password1234')
    await user.click(screen.getByRole('button', { name: /activar cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText('Propiedades')).toBeInTheDocument()
    })

    const session = useSessionStore.getState().session
    expect(session?.organization?.id).toBe('org-9')
    expect(session?.permissions).toContain('user:manage') // owner
  })
})

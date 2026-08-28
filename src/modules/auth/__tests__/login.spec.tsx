// src/modules/auth/__tests__/login.spec.tsx
//
// SDD: sdd_03_api_contracts.md §1 "Autenticacion" + sdd_04_nonfunctional.md
// §2.2a (anti-enumeration) + §2.5 (ACCOUNT_LOCKED countdown).
// Issue #5 CA: "Los textos anti-enumeration son literales segun la spec." /
// "El estado ACCOUNT_LOCKED se muestra con countdown."
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
  },
}))

import { authApi } from '@/api/auth.api'

describe('UC-LOGIN — Login (sdd_03 §1)', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null })
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('CA-05-01: credenciales incorrectas muestra el texto anti-enumeration literal', async () => {
    vi.mocked(authApi.login).mockRejectedValueOnce(
      new AdminPropApiError('UNAUTHORIZED', 401, 'Credenciales incorrectas.'),
    )

    renderAuthApp('/login')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'nadie@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'lo-que-sea')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas.')).toBeInTheDocument()
    })
  })

  it('CA-05-02: ACCOUNT_LOCKED muestra un countdown decreciente con retry_after_seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(authApi.login).mockRejectedValueOnce(
      new AdminPropApiError('ACCOUNT_LOCKED', 403, 'Cuenta bloqueada.', null, {
        retry_after_seconds: 125,
      }),
    )

    renderAuthApp('/login')
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.type(screen.getByLabelText(/email/i), 'nadie@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'lo-que-sea')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByTestId('account-locked-countdown')).toHaveTextContent('2:05')
    })

    await vi.advanceTimersByTimeAsync(1000)

    expect(screen.getByTestId('account-locked-countdown')).toHaveTextContent('2:04')
  })

  it('CA-05-03: usuario multi-org ve el selector y completa el login con la org elegida', async () => {
    vi.mocked(authApi.login)
      .mockResolvedValueOnce({
        data: {
          status: 'organization_selection_required',
          user: null,
          organizations: [
            { id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' },
            { id: 'org-2', name: 'Inmobiliaria Dos', role: 'admin' },
          ],
          // sdd_03 §1 v1.6: sin organization_id todavía no se emite JWT.
          permissions: null,
          is_super_admin: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          status: 'authenticated',
          user: { id: 'user-1', email: 'a@a.com', full_name: 'Ana Admin' },
          organizations: [{ id: 'org-2', name: 'Inmobiliaria Dos', role: 'admin' }],
          permissions: ['contract:read', 'contract:manage'],
          is_super_admin: false,
        },
      })

    renderAuthApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'a@a.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1234')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Inmobiliaria Dos')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /inmobiliaria dos/i }))

    await waitFor(() => {
      expect(authApi.login).toHaveBeenLastCalledWith(
        expect.objectContaining({ organization_id: 'org-2' }),
      )
    })

    await waitFor(() => {
      expect(useSessionStore.getState().session?.organization?.id).toBe('org-2')
      expect(useSessionStore.getState().session?.permissions).toContain('contract:manage')
    })
  })

  it('CA-45-01: login de Super Admin sin organizaciones setea sesión superadmin y navega a /superadmin', async () => {
    // sdd_03 §1 v1.6: "is_super_admin = el flag del usuario (true solo en
    // el login de Super Admin, que no lleva organizations[])" -- reproduce
    // el bug del issue #45 (Railway, primer login real de superadmin):
    // `organizations: []` + `is_super_admin: true` con `status:
    // "authenticated"`.
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: {
        status: 'authenticated',
        user: { id: 'sa-1', email: 'sa@adminprop.com', full_name: 'Super Admin' },
        organizations: [],
        permissions: [],
        is_super_admin: true,
      },
    })

    renderAuthApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'sa@adminprop.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1234')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Organizaciones')).toBeInTheDocument()
    })

    const session = useSessionStore.getState().session
    expect(session?.isSuperAdmin).toBe(true)
    expect(session?.organization).toBeNull()
    expect(session?.email).toBe('sa@adminprop.com')
  })

  it('CA-05-04: login exitoso con una sola organización redirige a "/" autenticado', async () => {
    vi.mocked(authApi.login).mockResolvedValueOnce({
      data: {
        status: 'authenticated',
        user: { id: 'user-1', email: 'owner@a.com', full_name: 'Owner Uno' },
        organizations: [{ id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' }],
        permissions: ['contract:read', 'contract:manage', 'user:manage'],
        is_super_admin: false,
      },
    })

    renderAuthApp('/login')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/email/i), 'owner@a.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'Password1234')
    await user.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(screen.getByText('Propiedades')).toBeInTheDocument()
    })
    expect(useSessionStore.getState().session?.email).toBe('owner@a.com')
  })
})

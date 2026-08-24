// src/modules/auth/__tests__/logout.spec.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderAuthApp } from './test-router'
import { useSessionStore, type Session } from '@/shared/auth/session-store'

vi.mock('@/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}))

import { authApi } from '@/api/auth.api'

const FAKE_SESSION: Session = {
  userId: 'user-1',
  email: 'owner@a.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' },
  permissions: ['contract:read'],
  isSuperAdmin: false,
}

describe('UC-LOGOUT — Logout (issue #5)', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: FAKE_SESSION })
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('CA-05-05: al visitar /logout se invalida la sesión server-side y redirige a /login', async () => {
    vi.mocked(authApi.logout).mockResolvedValueOnce(undefined)

    renderAuthApp('/logout')

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(screen.getByText('Ingresar a AdminProp')).toBeInTheDocument()
    })

    expect(useSessionStore.getState().session).toBeNull()
  })

  it('CA-05-06: si el request de logout falla igual limpia la sesión local y redirige', async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('network down'))

    renderAuthApp('/logout')

    await waitFor(() => {
      expect(screen.getByText('Ingresar a AdminProp')).toBeInTheDocument()
    })

    expect(useSessionStore.getState().session).toBeNull()
  })
})

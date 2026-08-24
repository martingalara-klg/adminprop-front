// src/shared/auth/__tests__/useSessionBootstrap.spec.ts
//
// issue #21 -- sdd_03 §1 v1.6 "GET /auth/me": rehidratación de sesión al
// montar la app. Cubre los 3 desenlaces documentados en la SDD: 200 (org y
// Super Admin), 401 (deslogueado), 403 MEMBERSHIP_INACTIVE (logout con
// mensaje es-AR).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { AdminPropApiError } from '@/api/errors'
import { useSessionStore } from '../session-store'

vi.mock('@/api/auth.api', () => ({
  authApi: {
    me: vi.fn(),
    logout: vi.fn(),
  },
}))

import { authApi } from '@/api/auth.api'
import { useSessionBootstrap } from '../useSessionBootstrap'

describe('UC-BOOTSTRAP — Rehidratación de sesión via GET /auth/me (issue #21)', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, logoutReason: null })
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('CA-21-01: sin sesión en memoria, éxito de /auth/me setea permissions[]/is_super_admin REALES', async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', email: 'owner@a.com', full_name: 'Owner Uno' },
        organization: { id: 'org-1', name: 'Inmobiliaria Uno' },
        role: 'owner',
        permissions: ['contract:read', 'user:manage'],
        is_super_admin: false,
      },
    })

    renderHook(() => useSessionBootstrap())

    await waitFor(() => {
      expect(useSessionStore.getState().session?.userId).toBe('user-1')
    })

    const session = useSessionStore.getState().session
    expect(session?.organization).toEqual({ id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' })
    expect(session?.permissions).toEqual(['contract:read', 'user:manage'])
    expect(session?.isSuperAdmin).toBe(false)
  })

  it('CA-21-02: sesión de Super Admin (organization/role null) se rehidrata con organization null', async () => {
    vi.mocked(authApi.me).mockResolvedValueOnce({
      data: {
        user: { id: 'sa-1', email: 'sa@adminprop.com', full_name: 'Super Admin' },
        organization: null,
        role: null,
        permissions: [],
        is_super_admin: true,
      },
    })

    renderHook(() => useSessionBootstrap())

    await waitFor(() => {
      expect(useSessionStore.getState().session?.isSuperAdmin).toBe(true)
    })

    expect(useSessionStore.getState().session?.organization).toBeNull()
  })

  it('CA-21-03: 401 (sin cookie válida) deja el store en estado deslogueado sin mensaje', async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(
      new AdminPropApiError('UNAUTHORIZED', 401, 'Tu sesión expiró.'),
    )

    renderHook(() => useSessionBootstrap())

    await waitFor(() => {
      expect(authApi.me).toHaveBeenCalledTimes(1)
    })

    expect(useSessionStore.getState().session).toBeNull()
    expect(useSessionStore.getState().logoutReason).toBeNull()
  })

  it('CA-21-04: 403 MEMBERSHIP_INACTIVE dispara logout con el mensaje es-AR del mapa central', async () => {
    vi.mocked(authApi.me).mockRejectedValueOnce(
      new AdminPropApiError('MEMBERSHIP_INACTIVE', 403, 'Membresía inactiva.'),
    )
    vi.mocked(authApi.logout).mockResolvedValueOnce(undefined)

    renderHook(() => useSessionBootstrap())

    await waitFor(() => {
      expect(authApi.logout).toHaveBeenCalledTimes(1)
    })

    expect(useSessionStore.getState().session).toBeNull()
    expect(useSessionStore.getState().logoutReason).toBe(
      'Tu membresía en esta organización está inactiva.',
    )
  })

  it('CA-21-05: si ya hay sesión en memoria, no vuelve a llamar GET /auth/me', () => {
    useSessionStore.setState({
      session: {
        userId: 'u1',
        email: 'a@a.com',
        fullName: 'Ana',
        organization: { id: 'org-1', name: 'Org 1', role: 'admin' },
        permissions: ['contract:read'],
        isSuperAdmin: false,
      },
      logoutReason: null,
    })

    renderHook(() => useSessionBootstrap())

    expect(authApi.me).not.toHaveBeenCalled()
  })
})

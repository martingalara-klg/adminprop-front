// src/shared/routing/__tests__/RequireSuperAdmin.spec.tsx
// SDD: CLAUDE.md front §4 "/superadmin/* vive en la misma app, protegido
// por is_super_admin". issue #6 — CA: guard superadmin positivo/negativo.
import { afterEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { renderShellApp as renderApp } from './test-shell-router'

describe('UC-06 — Guard de /superadmin/* (#6)', () => {
  afterEach(() => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-06-07: mientras el bootstrap está en curso, no decide todavía (muestra spinner)', () => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })

    renderApp('/superadmin/organizations')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Cargando sesión...')).toBeInTheDocument()
  })

  it('CA-06-08: un usuario sin is_super_admin que navega a /superadmin/* NO ve contenido superadmin (redirect)', async () => {
    useSessionStore.setState({
      session: buildSession({
        userId: 'u-owner',
        email: 'owner@a.com',
        fullName: 'Owner Uno',
        organization: { id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' },
        permissions: ['property:read', 'user:manage'],
        isSuperAdmin: false,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })

    renderApp('/superadmin/organizations')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Propiedades' })).toBeInTheDocument()
    })

    expect(screen.queryByText('Organizaciones (superadmin)')).not.toBeInTheDocument()
  })

  it('CA-06-09: sin sesión, /superadmin/* redirige encadenado hasta /login', async () => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: false })

    renderApp('/superadmin/organizations')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ingresar a adminprop/i })).toBeInTheDocument()
    })
  })

  it('CA-06-10: un Super Admin (is_super_admin=true) accede al namespace /superadmin/*', async () => {
    useSessionStore.setState({
      session: buildSession({
        userId: 'sa-1',
        email: 'sa@adminprop.com',
        fullName: 'Super Admin',
        organization: null,
        permissions: [],
        isSuperAdmin: true,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })

    renderApp('/superadmin/organizations')

    await waitFor(() => {
      expect(screen.getByText('Organizaciones (superadmin)')).toBeInTheDocument()
    })
  })
})

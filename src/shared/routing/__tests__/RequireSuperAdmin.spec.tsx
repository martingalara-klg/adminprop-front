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

    expect(screen.queryByRole('heading', { name: 'Organizaciones' })).not.toBeInTheDocument()
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
      expect(screen.getByRole('heading', { name: 'Organizaciones' })).toBeInTheDocument()
    })
  })

  it('CA-45-02: un Super Admin que navega a "/superadmin" (sin subpath) ve contenido, no una página en blanco', async () => {
    // issue #45 (síntoma 2, ambiente real): sin index route bajo
    // /superadmin, este path no matcheaba ningún hijo -- el <Outlet/> de
    // RequireSuperAdmin renderizaba nada. Reproduce el destino exacto al
    // que navega LoginPage tras un login de Super Admin.
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

    renderApp('/superadmin')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Organizaciones' })).toBeInTheDocument()
    })
  })

  it('CA-45-03: recarga completa en "/superadmin" (bootstrap desde cero) resuelve a contenido tras /auth/me', async () => {
    // issue #45 (síntoma 2): una recarga de página arranca con
    // isBootstrapping=true y session=null hasta que useSessionBootstrap
    // resuelve GET /auth/me -- verifica que, una vez resuelto con una
    // sesión de Super Admin (mismo shape que get_current_session en el
    // backend: organization null, is_super_admin true), "/superadmin"
    // termina mostrando contenido y no queda en blanco.
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })

    renderApp('/superadmin')

    expect(screen.getByText('Cargando sesión...')).toBeInTheDocument()

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

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Organizaciones' })).toBeInTheDocument()
    })
  })
})

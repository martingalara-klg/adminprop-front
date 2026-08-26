// src/shared/routing/__tests__/AppLayout.spec.tsx
// SDD: CLAUDE.md front §4 "Reglas duras del cliente" + §"Permisos".
// issue #6 — CA: shell real (nav por permisos, guard superadmin, redirect
// de raíz según sesión).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { renderShellApp as renderApp } from './test-shell-router'

// issue #15: AppLayout ahora monta <NotificationBell/> en el header (gate
// por `notification:read`, presente en los 3 roles) — mockeado acá para
// no disparar requests reales; el comportamiento del bell tiene su propia
// suite en src/modules/notifications/__tests__/notifications.spec.tsx.
vi.mock('@/api/notifications.api', () => ({
  notificationsApi: {
    list: vi.fn().mockResolvedValue({ data: [], meta: { unread_count: 0 } }),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

describe('UC-06 — Shell de la app (#6)', () => {
  afterEach(() => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-06-01: mientras el bootstrap de sesión está en curso, muestra el spinner de carga', async () => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })

    renderApp('/')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Cargando sesión...')).toBeInTheDocument()
  })

  it('CA-06-02: sin sesión (bootstrap resuelto), redirige a /login', async () => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: false })

    renderApp('/')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ingresar a adminprop/i })).toBeInTheDocument()
    })
  })

  it('CA-06-03: un usuario maintenance sólo ve el módulo de mantenimiento (+ notificaciones + cuenta propia)', async () => {
    useSessionStore.setState({
      session: buildSession({
        userId: 'u-maint',
        email: 'mario@a.com',
        fullName: 'Mario Mantenimiento',
        organization: { id: 'org-1', name: 'Org 1', role: 'maintenance' },
        permissions: [
          'work-order:read',
          'work-order:quote',
          'work-order:close',
          'notification:read',
        ],
        isSuperAdmin: false,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })

    renderApp('/')

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument()
    })

    const nav = screen.getByRole('navigation', { name: /navegación principal/i })
    expect(nav).toHaveTextContent('Mantenimiento')
    expect(nav).toHaveTextContent('Notificaciones')
    expect(nav).toHaveTextContent('Mi cuenta')

    // Nunca contratos, cobranzas ni liquidaciones para maintenance.
    expect(nav).not.toHaveTextContent('Contratos')
    expect(nav).not.toHaveTextContent('Cobranzas')
    expect(nav).not.toHaveTextContent('Liquidaciones')
    expect(nav).not.toHaveTextContent('Propiedades')
    expect(nav).not.toHaveTextContent('Personas')
    expect(nav).not.toHaveTextContent('Administración')
  })

  it('CA-06-04: un owner ve todos los módulos de negocio + administración', async () => {
    useSessionStore.setState({
      session: buildSession({
        userId: 'u-owner',
        email: 'owner@a.com',
        fullName: 'Owner Uno',
        organization: { id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' },
        permissions: [
          'property:read',
          'landlord:read',
          'contract:read',
          'rent-period:read',
          'settlement:read',
          'work-order:read',
          'user:manage',
          'notification:read',
        ],
        isSuperAdmin: false,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })

    renderApp('/')

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument()
    })

    const nav = screen.getByRole('navigation', { name: /navegación principal/i })
    for (const label of [
      'Propiedades',
      'Personas',
      'Contratos',
      'Cobranzas',
      'Liquidaciones',
      'Mantenimiento',
      'Administración',
      'Notificaciones',
      'Mi cuenta',
    ]) {
      expect(nav).toHaveTextContent(label)
    }
  })

  it('CA-06-05: el header muestra el nombre del usuario, su organización y un logout que navega a /logout', async () => {
    useSessionStore.setState({
      session: buildSession({
        userId: 'u-admin',
        email: 'ana@a.com',
        fullName: 'Ana Admin',
        organization: { id: 'org-1', name: 'Inmobiliaria Uno', role: 'admin' },
        permissions: ['property:read'],
        isSuperAdmin: false,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })

    renderApp('/')

    await waitFor(() => {
      expect(screen.getByText('Ana Admin')).toBeInTheDocument()
    })

    expect(screen.getByText('Inmobiliaria Uno')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cerrar sesión/i })).toHaveAttribute('href', '/logout')
  })

  it('CA-06-06: "/" redirige al primer módulo visible cuando el usuario no tiene property:read (ej: maintenance)', async () => {
    useSessionStore.setState({
      session: buildSession({
        userId: 'u-maint',
        email: 'mario@a.com',
        fullName: 'Mario Mantenimiento',
        organization: { id: 'org-1', name: 'Org 1', role: 'maintenance' },
        permissions: ['work-order:read', 'notification:read'],
        isSuperAdmin: false,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })

    renderApp('/')

    await waitFor(() => {
      // #13 le dio contenido real a MaintenanceListPage (antes era un
      // ModulePlaceholder con título exacto "Mantenimiento") — el heading
      // ahora incluye el subtítulo del módulo; se matchea por regex.
      expect(screen.getByRole('heading', { name: /mantenimiento/i })).toBeInTheDocument()
    })
  })
})

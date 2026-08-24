// Fase 0 — Scaffolding (#3) + Fase 1 — Shell real (#6).
//
// CA-03-01 pasó de renderizar el placeholder de propiedades sin sesión a
// depender del shell real: `AppLayout` ahora exige sesión resuelta antes
// de mostrar cualquier módulo (redirect a /login sin sesión, ver
// src/shared/routing/__tests__/AppLayout.spec.tsx para esos casos). Este
// archivo sigue cubriendo el smoke de routing lazy por módulo (#3).
//
// CA-03-01 usa el harness de router "clásico" (`renderShellApp`, ver
// src/shared/routing/__tests__/test-shell-router.tsx) en vez del
// `createMemoryRouter` real de `src/routes.tsx`: `HomeRedirect` (#6) hace
// un `<Navigate>` real al montar, y jsdom no implementa el `AbortSignal`
// nativo que usa el fetcher interno del data router de React Router al
// navegar — limitación conocida del entorno de test, no del código de
// producción (ver comentario de test-shell-router.tsx). CA-03-02 no
// renderiza nada -- sigue inspeccionando `appRoutes` directamente.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { appRoutes } from '@/routes'
import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { renderShellApp } from '@/shared/routing/__tests__/test-shell-router'

describe('Scaffolding — App shell (#3) + shell real (#6)', () => {
  beforeEach(() => {
    // issue #6: AppLayout ahora exige sesión resuelta -- simular un owner
    // ya autenticado (bootstrap ya terminado) para ejercitar el mismo
    // smoke de routing lazy que #3 cubría sin sesión.
    useSessionStore.setState({
      session: buildSession({
        userId: 'u1',
        email: 'owner@a.com',
        fullName: 'Owner Uno',
        organization: { id: 'org-1', name: 'Inmobiliaria Uno', role: 'owner' },
        permissions: ['property:read'],
        isSuperAdmin: false,
      }),
      logoutReason: null,
      isBootstrapping: false,
    })
  })

  afterEach(() => {
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-03-01: la app monta, redirige a la ruta default y renderiza un módulo lazy', async () => {
    renderShellApp('/')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Propiedades' })).toBeInTheDocument()
    })
  })

  it('CA-03-02: cada módulo del roadmap aporta al menos una ruta lazy registrada', () => {
    const flatPaths = appRoutes.flatMap((route) =>
      route.children ? route.children.map((child) => child.path) : [route.path],
    )

    expect(flatPaths).toEqual(
      expect.arrayContaining([
        'properties',
        'people',
        'contracts',
        'payments',
        'settlements',
        'maintenance',
        'admin',
        'notifications',
        'account',
      ]),
    )
  })
})

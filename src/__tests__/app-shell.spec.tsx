// Fase 0 — Scaffolding (#3). Smoke test del shell de la app: routing lazy
// por módulo + shell mínimo. No cubre lógica de negocio (no existe todavía).
//
// Usa createMemoryRouter (en vez del createBrowserRouter real de App.tsx)
// porque jsdom no implementa el AbortSignal nativo que usa el fetcher
// interno de React Router sobre `createBrowserRouter` — limitación conocida
// del entorno de test, no del código de producción.

import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'

import { queryClient } from '@/shared/queryClient'
import { Spinner } from '@/shared/components/Spinner'
import { appRoutes } from '@/routes'

describe('Scaffolding — App shell (#3)', () => {
  it('CA-03-01: la app monta, redirige a la ruta default y renderiza un módulo lazy', async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ['/'] })

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<Spinner label="Cargando..." />}>
          <RouterProvider router={router} />
        </Suspense>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Propiedades')).toBeInTheDocument()
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

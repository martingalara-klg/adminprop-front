import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/shared/queryClient'
import { Spinner } from '@/shared/components/Spinner'
import { useSessionBootstrap } from '@/shared/auth/useSessionBootstrap'
import { appRoutes } from './routes'

const router = createBrowserRouter(appRoutes)

export function App() {
  // issue #21: rehidrata la sesión via GET /auth/me al montar la app si no
  // hay sesión en memoria (docs/skills/tenant-context.md §"Inicialización").
  useSessionBootstrap()

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<Spinner label="Cargando..." />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  )
}

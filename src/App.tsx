import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import { queryClient } from '@/shared/queryClient'
import { Spinner } from '@/shared/components/Spinner'
import { appRoutes } from './routes'

const router = createBrowserRouter(appRoutes)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<Spinner label="Cargando..." />}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>
  )
}

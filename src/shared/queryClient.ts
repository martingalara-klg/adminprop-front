import { QueryClient } from '@tanstack/react-query'
import { AdminPropApiError, mapError } from '@/api/errors'

/**
 * Cliente TanStack Query compartido. staleTime por query se define en cada
 * hook (ver docs/skills/state-management.md), alineado a sdd_04 §1.4.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const apiError = error instanceof AdminPropApiError ? error : mapError(error)
        // No reintentar 4xx (errores de negocio o auth) — solo 5xx/red.
        if (apiError.status >= 400 && apiError.status < 500) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

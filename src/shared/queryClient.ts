import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente TanStack Query compartido. staleTime por query se define en cada
 * hook (ver docs/skills/state-management.md), alineado a sdd_04 §1.4.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

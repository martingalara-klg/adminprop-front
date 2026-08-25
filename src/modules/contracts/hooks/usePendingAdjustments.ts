// src/modules/contracts/hooks/usePendingAdjustments.ts
//
// RF-04 paso 3, CA-03-04: bandeja de ajustes pendientes.
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function usePendingAdjustments(enabled = true) {
  return useQuery({
    queryKey: ['adjustments', 'pending'],
    queryFn: ({ signal }) => contractsApi.listPendingAdjustments({ signal }),
    staleTime: 60_000,
    enabled,
  })
}

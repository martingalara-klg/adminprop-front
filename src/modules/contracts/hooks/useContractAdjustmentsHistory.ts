// src/modules/contracts/hooks/useContractAdjustmentsHistory.ts
//
// RF-01 + RF-04 paso 5: historial de ajustes aplicados a un contrato.
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useContractAdjustmentsHistory(contractId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['contracts', 'adjustments', contractId],
    queryFn: ({ signal }) => contractsApi.listAdjustments(contractId as string, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!contractId,
  })
}

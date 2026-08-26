// src/modules/contracts/hooks/useContractDetail.ts
//
// RF-01: detalle del contrato — condiciones, monto vigente.
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useContractDetail(contractId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['contracts', 'detail', contractId],
    queryFn: ({ signal }) => contractsApi.get(contractId as string, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!contractId,
  })
}

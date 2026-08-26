// src/modules/contracts/hooks/useActivateContract.ts
//
// RF-03 + CA-03-01/02: `draft → active`.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useActivateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contractId: string) => contractsApi.activate(contractId),
    retry: 0,
    onSuccess: (_data, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['contracts', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['contracts', 'detail', contractId] })
    },
  })
}
